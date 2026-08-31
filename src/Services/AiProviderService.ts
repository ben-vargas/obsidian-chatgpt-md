import { Editor, MarkdownView } from "obsidian";
import { Message } from "src/Models/Message";
import { ChatGPT_MDSettings } from "src/Models/Config";
import { ApiService } from "./ApiService";
import { ApiAuthService } from "./ApiAuthService";
import { NotificationService } from "./NotificationService";
import { StreamingHandler } from "./StreamingHandler";
import { consumeTextStream } from "./StreamConsumer";
import { isModelWhitelisted } from "./ToolSupportDetector";
import { formatStreamError } from "src/Utilities/AiErrorFormatter";
import { insertAssistantHeader } from "src/Utilities/ResponseHelpers";
import { prepareAiSdkPrompt } from "src/Utilities/PromptHelpers";
import { getGenerationOptions } from "src/Utilities/AiRequestOptions";
import { IAiApiService, StreamingResponse, TitleWriter, ToolRequestService } from "src/Types/AiTypes";
import { Logger } from "src/Utilities/Logger";
import { generateText, LanguageModel, streamText } from "ai";

import { AiProviderConfig, ProviderType } from "./Adapters/ProviderAdapter";
import { ProviderRuntime } from "./ProviderRuntime";

// Constants
import { NEWLINE, ROLE_USER, TITLE_INFERENCE_ERROR_HEADER, TRUNCATION_ERROR_INDICATOR } from "src/Constants";

/**
 * Unified AI Provider Service
 * Consolidates all AI provider logic into a single service using the adapter pattern
 * Replaces BaseAiService + 6 individual provider services
 */
export class AiProviderService implements IAiApiService {
  private readonly apiService: ApiService;
  private readonly apiAuthService: ApiAuthService;
  private readonly notificationService: NotificationService;

  private readonly providerRuntime: ProviderRuntime;

  constructor(apiService: ApiService, apiAuthService: ApiAuthService, notificationService: NotificationService) {
    this.apiService = apiService;
    this.apiAuthService = apiAuthService;
    this.notificationService = notificationService;
    this.providerRuntime = new ProviderRuntime(apiService);
  }

  /**
   * Set the current provider adapter based on model string
   * @param model - Model ID with optional provider prefix (e.g., "openai@gpt-4" or "gpt-4")
   */
  private setProviderFromModel(model: string): void {
    this.providerRuntime.selectFromModel(model);
  }

  /**
   * Check if a model supports tools (whitelist check)
   */
  private modelSupportsTools(modelName: string, settings: ChatGPT_MDSettings): boolean {
    return isModelWhitelisted(modelName, settings.toolEnabledModels || "");
  }

  /**
   * Get the default configuration for the current provider
   */
  private getDefaultConfig(): AiProviderConfig {
    return this.providerRuntime.getDefaultConfig();
  }

  /**
   * Get the API key from settings for the current provider
   */
  private getApiKeyFromSettings(settings: ChatGPT_MDSettings): string {
    return this.apiAuthService.getApiKey(settings, this.providerRuntime.currentAdapter.type);
  }

  /**
   * Fetch available models from a specific provider
   * @param url - Base URL for API
   * @param apiKey - API key for authentication (if required)
   * @param settings - Plugin settings (unused, kept for API compatibility)
   * @param providerType - Optional provider type (defaults to current adapter)
   */
  async fetchAvailableModels(
    url: string,
    apiKey?: string,
    settings?: ChatGPT_MDSettings,
    providerType?: ProviderType
  ): Promise<string[]> {
    try {
      // Set provider if specified
      if (providerType) this.providerRuntime.selectProvider(providerType);

      if (!apiKey && this.providerRuntime.currentAdapter.requiresApiKey()) {
        Logger.error(`${this.providerRuntime.currentAdapter.displayName} API key is missing.`);
        return [];
      }

      return await this.providerRuntime.currentAdapter.fetchModels(
        url,
        apiKey,
        settings,
        this.apiService.makeGetRequest.bind(this.apiService)
      );
    } catch (error) {
      Logger.error(`Error fetching ${this.providerRuntime.currentAdapter.displayName} models`, { error });
      return [];
    }
  }

  /**
   * Call the AI API with the given parameters
   */
  async callAiAPI(
    messages: Message[],
    options: Partial<AiProviderConfig> = {},
    headingPrefix: string,
    url: string,
    editor?: Editor,
    setAtCursor?: boolean,
    apiKey?: string,
    settings?: ChatGPT_MDSettings,
    toolService?: ToolRequestService
  ): Promise<{ fullString: string; mode: string; wasAborted?: boolean }> {
    Logger.debug(`[ChatGPT MD] callAiAPI called`, {
      model: options.model,
      url,
      messageCount: messages.length,
      stream: options.stream,
      hasEditor: !!editor,
    });

    const config = { ...this.getDefaultConfig(), ...options };

    // Set provider from model
    this.setProviderFromModel(config.model);

    Logger.debug(`[ChatGPT MD] Provider set to: ${this.providerRuntime.currentAdapter.type}`, {
      finalModel: config.model,
      finalUrl: url,
    });

    // Use URL from settings if available
    if (settings) {
      config.url = url;
    }

    return config.stream && editor
      ? this.callStreamingAPI(apiKey, messages, config, editor, headingPrefix, setAtCursor, settings, toolService)
      : this.callNonStreamingAPI(apiKey, messages, config, settings, toolService);
  }

  /**
   * Infer a title from messages
   */
  async inferTitle(
    view: MarkdownView,
    settings: ChatGPT_MDSettings,
    messages: string[],
    editorService: TitleWriter
  ): Promise<string> {
    try {
      if (!view.file) {
        throw new Error("No active file found");
      }

      // Select the provider adapter from the configured model BEFORE resolving
      // the API key. Title inference does not go through callAiAPI (which is
      // where the adapter is normally selected), so without this it falls back
      // to the default OpenAI adapter and fails for other providers such as
      // OpenRouter (wrong API key, base URL and model-name handling).
      const modelString = (settings as { model?: string }).model ?? "";
      this.setProviderFromModel(modelString);

      const apiKey = this.getApiKeyFromSettings(settings);
      const titleResponse = await this.inferTitleFromMessages(apiKey, messages, settings);

      let titleStr = "";

      if (typeof titleResponse === "string") {
        if (this.isTruncationError(titleResponse)) {
          this.handleTitleTruncationError(view, titleResponse);
          this.showNoTitleInferredNotification();
          return "";
        }
        titleStr = titleResponse;
      } else if (titleResponse && typeof titleResponse === "object") {
        const responseObj = titleResponse as { fullString?: string };
        const responseText = responseObj.fullString || "";

        if (this.isTruncationError(responseText)) {
          this.handleTitleTruncationError(view, responseText);
          this.showNoTitleInferredNotification();
          return "";
        }

        titleStr = responseText;
      }

      if (titleStr && titleStr.trim().length > 0) {
        await editorService.writeInferredTitle(view, titleStr.trim());
        return titleStr.trim();
      } else {
        this.showNoTitleInferredNotification();
        return "";
      }
    } catch (error) {
      Logger.error("[ChatGPT MD] Error in inferTitle", { error });
      this.showNoTitleInferredNotification();
      return "";
    }
  }

  /**
   * Show a notification when title inference fails
   */
  private showNoTitleInferredNotification(): void {
    this.notificationService.showWarning("Could not infer title. The file name was not changed.");
  }

  /**
   * Check if response contains truncation error
   */
  private isTruncationError(response: string): boolean {
    return response.includes(TRUNCATION_ERROR_INDICATOR);
  }

  /**
   * Handle truncation error in title inference
   */
  private handleTitleTruncationError(view: MarkdownView, errorMessage: string): void {
    const editor = view.editor;
    const lastLine = editor.lastLine();
    const lastLineLength = editor.getLine(lastLine).length;
    const endCursor = { line: lastLine, ch: lastLineLength };
    editor.setCursor(endCursor);

    const headingPrefix = "#".repeat(2) + " ";
    const errorHeader = `\n---\n${headingPrefix}${TITLE_INFERENCE_ERROR_HEADER}\n`;
    editor.replaceRange(errorHeader + errorMessage + "\n", endCursor);
  }

  /**
   * Infer a title from messages
   */
  private inferTitleFromMessages = async (
    apiKey: string,
    messages: string[],
    settings: ChatGPT_MDSettings
  ): Promise<string> => {
    try {
      if (messages.length < 2) {
        this.notificationService.showWarning("Not enough messages to infer title. Minimum 2 messages.");
        return "";
      }

      const prompt = `Infer title from the summary of the content of these messages. The title **cannot** contain any of the following characters: colon (:), back slash (\\), forward slash (/), asterisk (*), question mark (?), double quote ("), less than (<), greater than (>), or pipe (|) as these are invalid in file names. Just return the title. Write the title in ${settings.inferTitleLanguage}. \nMessages:${NEWLINE}${JSON.stringify(
        messages
      )}`;

      const defaultConfig = this.getDefaultConfig();
      const config = {
        ...defaultConfig,
        ...settings,
      };

      if (!config.model) {
        config.model = defaultConfig.model;
      }

      if (!config.url) {
        config.url = defaultConfig.url;
      }

      try {
        const response = await this.callNonStreamingAPI(
          apiKey,
          [{ role: ROLE_USER, content: prompt }],
          config,
          settings
        );
        return response.fullString;
      } catch (apiError) {
        Logger.error("[ChatGPT MD] Error calling API for title inference", { error: apiError });
        return "";
      }
    } catch (err) {
      Logger.error("[ChatGPT MD] Error inferring title", { error: err });
      this.showNoTitleInferredNotification();
      return "";
    }
  };

  /**
   * Stop streaming
   */
  public stopStreaming(): void {
    this.apiService?.stopStreaming();
  }

  /**
   * Call the AI API in streaming mode
   */
  private async callStreamingAPI(
    apiKey: string | undefined,
    messages: Message[],
    config: AiProviderConfig,
    editor: Editor,
    headingPrefix: string,
    setAtCursor?: boolean,
    settings?: ChatGPT_MDSettings,
    toolService?: ToolRequestService
  ): Promise<StreamingResponse> {
    Logger.debug(`[ChatGPT MD] callStreamingAPI called`, {
      provider: this.providerRuntime.currentAdapter.type,
      model: config.model,
      messageCount: messages.length,
    });

    const model = this.providerRuntime.createLanguageModel(apiKey, config);

    // Get tools only if toolService is available and settings are provided
    const tools = toolService && settings ? toolService.getToolsForRequest(settings) : undefined;
    return this.callAiSdkStreamText(
      model,
      config.model,
      messages,
      config,
      editor,
      headingPrefix,
      setAtCursor,
      tools,
      toolService,
      settings
    );
  }

  /**
   * Call the AI API in non-streaming mode
   */
  private async callNonStreamingAPI(
    apiKey: string | undefined,
    messages: Message[],
    config: AiProviderConfig,
    settings?: ChatGPT_MDSettings,
    toolService?: ToolRequestService
  ): Promise<{ fullString: string; mode: string }> {
    const model = this.providerRuntime.createLanguageModel(apiKey, config);

    // Get tools only if toolService is available and settings are provided
    const tools = toolService && settings ? toolService.getToolsForRequest(settings) : undefined;
    return this.callAiSdkGenerateText(model, config.model, messages, config, tools, toolService, settings);
  }

  /**
   * Common AI SDK generateText implementation
   */
  private async callAiSdkGenerateText(
    model: LanguageModel,
    modelName: string,
    messages: Message[],
    config: AiProviderConfig,
    tools?: unknown,
    toolService?: ToolRequestService,
    settings?: ChatGPT_MDSettings
  ): Promise<{ fullString: string; mode: string }> {
    const { instructions, messages: aiSdkMessages } = prepareAiSdkPrompt(messages);

    const request: Parameters<typeof generateText>[0] = {
      model,
      messages: aiSdkMessages,
      ...(instructions ? { instructions } : {}),
      ...getGenerationOptions(config),
    };

    const toolsAvailable = tools && typeof tools === "object" && Object.keys(tools).length > 0;
    const shouldUseTool = toolsAvailable && settings && this.modelSupportsTools(modelName, settings);

    if (shouldUseTool) {
      request.tools = tools as typeof request.tools;
    }

    let response;
    try {
      response = await generateText(request);
    } catch (err: unknown) {
      Logger.debug(`[ChatGPT MD] Error during generateText:`, err);
      throw err;
    }

    if (toolService && response.toolCalls && response.toolCalls.length > 0) {
      const toolResults = await toolService.handleToolCalls(response.toolCalls, modelName);
      const { contextMessages } = await toolService.processToolResults(response.toolCalls, toolResults, modelName);

      const updatedMessages = [...aiSdkMessages];

      if (response.text?.trim()) {
        updatedMessages.push({ role: "assistant", content: response.text });
      }

      updatedMessages.push(...contextMessages);

      const continuationResponse = await generateText({
        model,
        messages: updatedMessages,
        ...(instructions ? { instructions } : {}),
        ...getGenerationOptions(config),
      });

      return { fullString: continuationResponse.text.trimStart(), mode: "non-streaming" };
    }

    return { fullString: response.text.trimStart(), mode: "non-streaming" };
  }

  /**
   * Common AI SDK streamText implementation
   */
  private async callAiSdkStreamText(
    model: LanguageModel,
    modelName: string,
    messages: Message[],
    config: AiProviderConfig,
    editor: Editor,
    headingPrefix: string,
    setAtCursor?: boolean,
    tools?: unknown,
    toolService?: ToolRequestService,
    settings?: ChatGPT_MDSettings
  ): Promise<StreamingResponse> {
    Logger.debug(`[ChatGPT MD] callAiSdkStreamText called`, { modelName, messageCount: messages.length });

    const { instructions, aiSdkMessages, handler, abortController } = this.setupStreamingContext(
      messages,
      editor,
      headingPrefix,
      modelName,
      setAtCursor
    );

    try {
      const fullText = await this.executeStreamingRequest({
        model,
        modelName,
        aiSdkMessages,
        instructions,
        abortSignal: abortController.signal,
        tools,
        settings,
        config,
        toolService,
        handler,
        editor,
      });

      if (!setAtCursor) editor.setCursor(handler.getCursor());

      return { fullString: fullText, mode: "streaming", wasAborted: this.apiService.wasAborted() };
    } catch (err: unknown) {
      return this.handleStreamError(err, handler, editor);
    }
  }

  private async executeStreamingRequest(options: {
    model: LanguageModel;
    modelName: string;
    aiSdkMessages: Array<{ role: "user" | "assistant"; content: string }>;
    instructions: string | undefined;
    abortSignal: AbortSignal;
    tools?: unknown;
    settings?: ChatGPT_MDSettings;
    config: AiProviderConfig;
    toolService?: ToolRequestService;
    handler: StreamingHandler;
    editor: Editor;
  }): Promise<string> {
    const request = this.buildStreamRequest(
      options.model,
      options.aiSdkMessages,
      options.instructions,
      options.abortSignal,
      options.tools,
      options.modelName,
      options.settings,
      options.config
    );

    Logger.debug(`[ChatGPT MD] Starting streamText with request`, {
      model: request.model,
      messageCount: request.messages?.length,
      hasAbortSignal: !!request.abortSignal,
    });

    options.handler.startBuffering();
    const result = streamText(request);
    const fullText = await consumeTextStream(result.textStream, options.handler, {
      isAborted: () => this.apiService.wasAborted(),
      trimLeadingWhitespace: true,
    });
    options.handler.stopBuffering();
    const finishReason = await result.finishReason;
    this.checkForStreamError(finishReason);

    if (!options.toolService) return fullText;
    return this.handleFinalToolCalls(result, fullText, options);
  }

  private async handleFinalToolCalls(
    finalResult: ReturnType<typeof streamText>,
    fullText: string,
    options: {
      model: LanguageModel;
      modelName: string;
      aiSdkMessages: Array<{ role: "user" | "assistant"; content: string }>;
      instructions: string | undefined;
      config: AiProviderConfig;
      toolService?: ToolRequestService;
      handler: StreamingHandler;
      editor: Editor;
    }
  ): Promise<string> {
    const toolCalls = await finalResult.toolCalls;
    if (!toolCalls?.length || !options.toolService) return fullText;

    return this.handleStreamToolCalls(
      toolCalls,
      fullText,
      options.handler,
      options.editor,
      options.model,
      options.aiSdkMessages,
      options.instructions,
      options.toolService,
      options.modelName,
      options.config
    );
  }

  /**
   * Setup streaming context with abort controller and handler
   */
  private setupStreamingContext(
    messages: Message[],
    editor: Editor,
    headingPrefix: string,
    modelName: string,
    setAtCursor?: boolean
  ) {
    const { instructions, messages: aiSdkMessages } = prepareAiSdkPrompt(messages);
    const cursorPositions = insertAssistantHeader(editor, headingPrefix, modelName);

    const abortController = new AbortController();
    this.apiService.setAbortController(abortController);

    const initialCursor = setAtCursor ? cursorPositions.initialCursor : cursorPositions.newCursor;
    const handler = new StreamingHandler(editor, initialCursor, setAtCursor);

    return { instructions, aiSdkMessages, handler, abortController };
  }

  /**
   * Handle streaming error
   */
  private handleStreamError(err: unknown, handler: StreamingHandler, editor: Editor): StreamingResponse {
    handler.stopBuffering();
    const errorMessage = formatStreamError(err);
    const errorCursor = handler.getCursor();
    editor.replaceRange(errorMessage, errorCursor);
    return { fullString: errorMessage, mode: "streaming" };
  }

  /**
   * Build stream request with optional tools
   */
  private buildStreamRequest(
    model: LanguageModel,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    instructions: string | undefined,
    abortSignal: AbortSignal,
    tools: unknown,
    modelName: string,
    settings: ChatGPT_MDSettings | undefined,
    config: AiProviderConfig
  ): Parameters<typeof streamText>[0] {
    const request: Parameters<typeof streamText>[0] = {
      model,
      messages,
      ...(instructions ? { instructions } : {}),
      abortSignal,
      ...getGenerationOptions(config),
    };

    const toolsAvailable = tools && typeof tools === "object" && Object.keys(tools).length > 0;
    const shouldUseTool = toolsAvailable && settings && this.modelSupportsTools(modelName, settings);

    if (shouldUseTool) {
      request.tools = tools as typeof request.tools;
    }

    return request;
  }

  /**
   * Check if stream finished with error
   */
  private checkForStreamError(finishReason: string): void {
    if (finishReason === "error") {
      throw new Error("Stream finished with error");
    }
  }

  /**
   * Handle tool calls during streaming
   */
  private async handleStreamToolCalls(
    toolCalls: unknown[],
    fullText: string,
    handler: StreamingHandler,
    editor: Editor,
    model: LanguageModel,
    aiSdkMessages: Array<{ role: "user" | "assistant"; content: string }>,
    instructions: string | undefined,
    toolService: ToolRequestService,
    modelName: string,
    config: AiProviderConfig
  ): Promise<string> {
    // Insert tool notice
    const toolNotice = "_[Tool approval required...]_\n";
    const indicatorCursor = handler.getCursor();
    editor.replaceRange(toolNotice, indicatorCursor);
    handler.updateCursorAfterInsert(toolNotice, indicatorCursor);

    // Execute tools
    const toolResults = await toolService.handleToolCalls(toolCalls, modelName);
    const { contextMessages } = await toolService.processToolResults(toolCalls, toolResults, modelName);

    // Clean up notice
    const toolCursor = handler.getCursor();
    editor.replaceRange("", { line: toolCursor.line - 1, ch: 0 }, toolCursor);
    handler.setCursor({ line: toolCursor.line - 1, ch: 0 });

    // Continue with tool results
    const updatedMessages = [...aiSdkMessages, { role: "assistant" as const, content: fullText }, ...contextMessages];

    return this.streamContinuation(model, updatedMessages, instructions, handler, fullText, config);
  }

  /**
   * Stream continuation after tool calls
   */
  private async streamContinuation(
    model: LanguageModel,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    instructions: string | undefined,
    handler: StreamingHandler,
    initialText: string,
    config: AiProviderConfig
  ): Promise<string> {
    const continuationResult = streamText({
      model,
      messages,
      ...(instructions ? { instructions } : {}),
      ...getGenerationOptions(config),
    });

    const continuationCursor = handler.getCursor();
    handler.reset(continuationCursor);
    handler.startBuffering();

    try {
      const fullText = await consumeTextStream(continuationResult.textStream, handler, {
        isAborted: () => this.apiService.wasAborted(),
        initialText,
      });
      const finishReason = await continuationResult.finishReason;
      this.checkForStreamError(finishReason);
      return fullText;
    } finally {
      handler.stopBuffering();
    }
  }
}
