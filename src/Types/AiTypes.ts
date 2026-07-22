import { Editor, MarkdownView } from "obsidian";
import { ChatGPT_MDSettings } from "src/Models/Config";
import { Message } from "src/Models/Message";
import { ToolExecutionResult } from "src/Models/Tool";

export interface TitleWriter {
  writeInferredTitle(view: MarkdownView, title: string): Promise<void>;
}

export interface ToolRequestService {
  getToolsForRequest(settings: ChatGPT_MDSettings): Record<string, unknown> | undefined;
  handleToolCalls(toolCalls: unknown[], modelName?: string): Promise<ToolExecutionResult[]>;
  processToolResults(
    toolCalls: unknown[],
    toolResults: ToolExecutionResult[],
    modelName?: string
  ): Promise<{
    filteredResults: ToolExecutionResult[];
    contextMessages: Array<{ role: "user"; content: string }>;
  }>;
}

export interface IAiApiService {
  callAiAPI(
    messages: Message[],
    options: Record<string, unknown>,
    headingPrefix: string,
    url: string,
    editor?: Editor,
    setAtCursor?: boolean,
    apiKey?: string,
    settings?: ChatGPT_MDSettings,
    toolService?: ToolRequestService
  ): Promise<{ fullString: string; mode: string; wasAborted?: boolean }>;

  inferTitle(
    view: MarkdownView,
    settings: ChatGPT_MDSettings,
    messages: string[],
    editorService: TitleWriter
  ): Promise<string>;

  fetchAvailableModels(
    url: string,
    apiKey?: string,
    settings?: ChatGPT_MDSettings,
    providerType?: string
  ): Promise<string[]>;
}

export type StreamingResponse = {
  fullString: string;
  mode: "streaming";
  wasAborted?: boolean;
};
