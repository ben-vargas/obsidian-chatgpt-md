import { Editor, MarkdownView, Notice, Platform } from "obsidian";
import { ServiceContainer } from "src/core/ServiceContainer";
import { getHeadingPrefix } from "src/Utilities/TextHelpers";
import { getDefaultModelForService, isTitleTimestampFormat } from "src/Utilities/FrontmatterHelpers";
import { buildChatSystemMessages } from "src/Utilities/PromptHelpers";
import { ChatGPT_MDSettings, MergedFrontmatterConfig } from "src/Models/Config";
import { Message } from "src/Models/Message";
import {
  AI_SERVICE_OPENROUTER,
  CALL_CHATGPT_API_COMMAND_ID,
  MIN_AUTO_INFER_MESSAGES,
  NOTICE_DURATION_LONG_MS,
  NOTICE_DURATION_SHORT_MS,
  PLUGIN_PREFIX,
} from "src/Constants";
// DEFAULT_*_CONFIG imports removed - using getDefaultModelForService instead
import { getAiApiUrls } from "./CommandUtilities";
import { AbortableAiService } from "./StopStreamingHandler";
import { CommandMetadata, EditorViewCommandHandler } from "./CommandHandler";

/**
 * Handler for the main chat command
 * Uses constructor injection for all dependencies
 */
export class ChatHandler implements EditorViewCommandHandler {
  private statusBarItemEl: HTMLElement;

  constructor(
    private services: ServiceContainer,
    private stopStreamingHandler: {
      setCurrentAiService: (aiService: AbortableAiService) => void;
      clearCurrentAiService: (aiService: AbortableAiService) => void;
    }
  ) {
    this.statusBarItemEl = services.plugin.addStatusBarItem();
  }

  getCommand(): CommandMetadata {
    return {
      id: CALL_CHATGPT_API_COMMAND_ID,
      name: "Chat",
      icon: "message-circle",
    };
  }

  /**
   * Execute the chat command
   */
  async execute(editor: Editor, view: MarkdownView): Promise<void> {
    const { editorService, settingsService, apiAuthService, toolService } = this.services;
    const settings = settingsService.getSettings();
    const frontmatter: MergedFrontmatterConfig = await editorService.getFrontmatter(view);

    const aiService = this.services.aiProviderService();
    this.stopStreamingHandler.setCurrentAiService(aiService);

    try {
      // Get messages from editor
      const { messagesWithRole: messagesWithRoleAndMessage, messages } = await editorService.getMessagesFromEditor(
        editor,
        settings
      );

      this.prependSystemMessages(messagesWithRoleAndMessage, frontmatter, settings.pluginSystemMessage);

      // Move cursor to end of file if generateAtCursor is false
      if (!settings.generateAtCursor) {
        editorService.moveCursorToEnd(editor);
      }

      this.showCallingStatus(frontmatter.model);

      // Get the appropriate API key for the service
      const apiKeyToUse = apiAuthService.getApiKey(settings, frontmatter.aiService);

      // Get tool service if tools are enabled
      const toolServiceToUse = settings.enableToolCalling ? toolService : undefined;

      const response = await aiService.callAiAPI(
        messagesWithRoleAndMessage,
        frontmatter,
        getHeadingPrefix(settings.headingLevel),
        frontmatter.url || getAiApiUrls(frontmatter)[frontmatter.aiService],
        editor,
        settings.generateAtCursor,
        apiKeyToUse,
        settings,
        toolServiceToUse
      );

      editorService.processResponse(editor, response, settings);

      await this.maybeInferTitle(view, frontmatter, settings, messagesWithRoleAndMessage, messages, aiService);
    } catch (err) {
      if (Platform.isMobile) {
        const reason = err instanceof Error ? err.message : String(err);
        new Notice(`${PLUGIN_PREFIX} Calling ${frontmatter.model}. ${reason}`, NOTICE_DURATION_LONG_MS);
      }
      this.services.errorService.handleApiError(err, "ChatHandler.execute", {
        showNotification: true,
        context: {
          model: frontmatter.model,
          url: frontmatter.url || getAiApiUrls(frontmatter)[frontmatter.aiService],
        },
      });
    } finally {
      this.stopStreamingHandler.clearCurrentAiService(aiService);
      this.updateStatusBar("");
    }
  }

  private async maybeInferTitle(
    view: MarkdownView,
    frontmatter: MergedFrontmatterConfig,
    settings: ChatGPT_MDSettings,
    messagesWithRole: Message[],
    messages: string[],
    aiService: ReturnType<ServiceContainer["aiProviderService"]>
  ): Promise<void> {
    if (!this.shouldInferTitle(view, settings, messagesWithRole)) return;

    const settingsWithApiKey = this.buildTitleInferenceSettings(settings, frontmatter);
    if (!this.ensureTitleInferenceModel(settingsWithApiKey, frontmatter.aiService)) return;

    await aiService.inferTitle(view, settingsWithApiKey, messages, this.services.editorService);
  }

  private shouldInferTitle(view: MarkdownView, settings: ChatGPT_MDSettings, messagesWithRole: Message[]): boolean {
    return (
      settings.autoInferTitle &&
      isTitleTimestampFormat(view?.file?.basename, settings.dateFormat) &&
      messagesWithRole.length > MIN_AUTO_INFER_MESSAGES
    );
  }

  private buildTitleInferenceSettings(
    settings: ChatGPT_MDSettings,
    frontmatter: MergedFrontmatterConfig
  ): ChatGPT_MDSettings & { url?: string; model?: string } {
    return {
      ...settings,
      ...frontmatter,
      openrouterApiKey: this.services.apiAuthService.getApiKey(settings, AI_SERVICE_OPENROUTER),
      url: frontmatter.url || getAiApiUrls(frontmatter)[frontmatter.aiService],
    };
  }

  private ensureTitleInferenceModel(settings: ChatGPT_MDSettings & { model?: string }, aiService: string): boolean {
    settings.model ||= getDefaultModelForService(aiService);
    if (settings.model) return true;

    new Notice(
      `Auto title inference skipped: No model configured for ${aiService}. Please set a model in settings.`,
      NOTICE_DURATION_SHORT_MS
    );
    return false;
  }

  private prependSystemMessages(
    messages: Message[],
    frontmatter: MergedFrontmatterConfig,
    pluginSystemMessage: string
  ): void {
    const systemMessages = buildChatSystemMessages(pluginSystemMessage, frontmatter);
    if (systemMessages.length > 0) messages.unshift(...systemMessages);
  }

  private showCallingStatus(model: string): void {
    if (Platform.isMobile) new Notice(`${PLUGIN_PREFIX} Calling ${model}`);
    else this.updateStatusBar(`Calling ${model}`);
  }

  /**
   * Update the status bar with the given text
   */
  private updateStatusBar(text: string): void {
    this.statusBarItemEl.setText(text);
  }
}
