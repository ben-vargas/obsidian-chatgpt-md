import { Editor, MarkdownView } from "obsidian";
import { ChatGPT_MDSettings, MergedFrontmatterConfig } from "src/Models/Config";
import { FileService } from "./FileService";
import { MessageService } from "./MessageService";
import { SettingsService } from "./SettingsService";
import { Message } from "src/Models/Message";
import { addCommentBlock, addHorizontalRule, moveCursorToEnd } from "src/Utilities/EditorHelpers";

/**
 * Service responsible for editor operations
 * Now includes editor content operations (merged from EditorContentService)
 */
export class EditorService {
  private fileService: FileService;
  private messageService: MessageService;
  private settingsService: SettingsService;

  constructor(fileService: FileService, messageService: MessageService, settingsService: SettingsService) {
    this.fileService = fileService;
    this.messageService = messageService;
    this.settingsService = settingsService;
  }

  // FileService delegations

  async writeInferredTitle(view: MarkdownView, title: string): Promise<void> {
    return this.fileService.writeInferredTitle(view, title);
  }

  async ensureFolderExists(folderPath: string, folderType: string): Promise<boolean> {
    return this.fileService.ensureFolderExists(folderPath, folderType);
  }

  getDate(date: Date, format: string): string {
    return this.fileService.formatDate(date, format);
  }

  // Editor content operations (merged from EditorContentService)

  addHorizontalRule(editor: Editor, role: string, headingLevel: number): void {
    addHorizontalRule(editor, role, headingLevel);
  }

  async clearChat(editor: Editor): Promise<void> {
    const frontmatterContent = this.extractFrontmatterBlock(editor.getValue());
    editor.setValue(frontmatterContent);
    this.positionCursorAfterClear(editor, frontmatterContent);
  }

  private extractFrontmatterBlock(content: string): string {
    const match = content.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/);
    return match ? `${match[0].trimEnd()}\n\n` : "";
  }

  private positionCursorAfterClear(editor: Editor, content: string): void {
    if (content) {
      editor.setCursor({ line: editor.lastLine() + 1, ch: 0 });
    } else {
      editor.setCursor({ line: 0, ch: 0 });
    }
  }

  moveCursorToEnd(editor: Editor): void {
    moveCursorToEnd(editor);
  }

  addCommentBlock(editor: Editor, commentStart: string, commentEnd: string): void {
    addCommentBlock(editor, commentStart, commentEnd);
  }

  // MessageService delegations

  async getMessagesFromEditor(
    editor: Editor,
    settings: ChatGPT_MDSettings
  ): Promise<{
    messages: string[];
    messagesWithRole: Message[];
  }> {
    return this.messageService.getMessagesFromEditor(editor, settings);
  }

  // FrontmatterService delegations

  async getFrontmatter(view: MarkdownView): Promise<MergedFrontmatterConfig> {
    return this.settingsService.getFrontmatter(view);
  }

  // ResponseProcessingService delegations

  processResponse(editor: Editor, response: { fullString: string; mode: string }, settings: ChatGPT_MDSettings): void {
    this.messageService.processResponse(editor, response, settings);
  }

  /**
   * Set the model in the front matter of the active file
   */
  async setModel(editor: Editor, modelName: string): Promise<void> {
    await this.settingsService.updateFrontmatterField("model", modelName);
  }
}
