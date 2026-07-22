import { App, Editor, MarkdownView } from "obsidian";
import { ChatGPT_MDSettings } from "src/Models/Config";
import { ChatTemplatesSuggestModal } from "src/Views/ChatTemplatesSuggestModal";
import { CHAT_FOLDER_TYPE, CHAT_TEMPLATE_FOLDER_TYPE } from "src/Constants";
import { FileService } from "./FileService";
import { moveCursorToEnd } from "src/Utilities/EditorHelpers";
import { Logger } from "src/Utilities/Logger";
import { NotificationService } from "./NotificationService";

/**
 * Service responsible for template management
 */
export class TemplateService {
  constructor(
    private app: App,
    private fileService: FileService,
    private notificationService: NotificationService
  ) {}

  /**
   * Create a new chat from a template
   */
  async createNewChatFromTemplate(settings: ChatGPT_MDSettings, fileName: string): Promise<void> {
    try {
      if (!settings.chatFolder || settings.chatFolder.trim() === "") {
        this.notificationService.showWarning("No chat folder configured. Please set one in settings.");
        return;
      }

      if (!settings.chatTemplateFolder || settings.chatTemplateFolder.trim() === "") {
        this.notificationService.showWarning("No chat template folder configured. Please set one in settings.");
        return;
      }

      const chatFolderExists = await this.fileService.ensureFolderExists(settings.chatFolder, CHAT_FOLDER_TYPE);
      if (!chatFolderExists) {
        return;
      }

      const templateFolderExists = await this.fileService.ensureFolderExists(
        settings.chatTemplateFolder,
        CHAT_TEMPLATE_FOLDER_TYPE
      );
      if (!templateFolderExists) {
        return;
      }

      new ChatTemplatesSuggestModal(this.app, settings, fileName).open();
    } catch (err) {
      Logger.error("[ChatGPT MD] Error creating chat from template", { error: err });
      this.notificationService.showError("Could not create chat from template. Check the console.");
    }
  }

  /**
   * Create a new chat with highlighted text
   */
  async createNewChatWithHighlightedText(editor: Editor, settings: ChatGPT_MDSettings): Promise<void> {
    try {
      const selectedText = editor.getSelection();

      if (!settings.chatFolder || settings.chatFolder.trim() === "") {
        this.notificationService.showWarning("No chat folder configured. Please set one in settings.");
        return;
      }

      const chatFolderExists = await this.fileService.ensureFolderExists(settings.chatFolder, CHAT_FOLDER_TYPE);
      if (!chatFolderExists) {
        return;
      }

      const fileName = `${this.fileService.formatDate(new Date(), settings.dateFormat)}.md`;
      const filePath = `${settings.chatFolder}/${fileName}`;

      // Apply default frontmatter from settings
      let content = "";
      if (settings.defaultChatFrontmatter) {
        content = settings.defaultChatFrontmatter + "\n\n";
      }

      // Add the selected text after the frontmatter
      if (selectedText) {
        content += selectedText;
      }

      const newFile = await this.fileService.createNewFile(filePath, content);

      await this.app.workspace.openLinkText(newFile.basename, "", true, { state: { mode: "source" } });
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

      if (!activeView) {
        this.notificationService.showWarning("No active markdown editor found.");
        return;
      }

      activeView.editor.focus();
      moveCursorToEnd(activeView.editor);
    } catch (err) {
      Logger.error("[ChatGPT MD] Error creating chat with highlighted text", { error: err });
      this.notificationService.showError("Could not create chat from highlighted text. Check the console.");
    }
  }
}
