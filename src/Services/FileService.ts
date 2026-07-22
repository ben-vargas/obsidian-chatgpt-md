import { App, MarkdownView, TFile } from "obsidian";
import { createFolderModal } from "src/Utilities/ModalHelpers";
import { Logger } from "src/Utilities/Logger";
import { NotificationService } from "./NotificationService";

/**
 * Service responsible for file and folder operations
 */
export class FileService {
  constructor(
    private app: App,
    private notificationService: NotificationService
  ) {}

  /**
   * Write an inferred title to a file by renaming it
   */
  async writeInferredTitle(view: MarkdownView, title: string): Promise<void> {
    const file = view.file;
    if (!file) {
      throw new Error("No file is currently open");
    }

    // Sanitize the title to remove invalid characters
    const sanitizedTitle = this.sanitizeFileName(title);

    const currentFolder = file.parent?.path ?? "/";
    let newFileName = `${currentFolder}/${sanitizedTitle}.md`;

    for (let i = 1; await this.app.vault.adapter.exists(newFileName); i++) {
      newFileName = `${currentFolder}/${sanitizedTitle} (${i}).md`;
    }

    try {
      await this.app.fileManager.renameFile(file, newFileName);
    } catch (err) {
      this.notificationService.showError("Error writing inferred title to editor");
      throw err;
    }
  }

  /**
   * Sanitize a file name by removing or replacing invalid characters
   * @param fileName The file name to sanitize
   * @returns The sanitized file name
   */
  sanitizeFileName(fileName: string): string {
    // Replace characters that are invalid in file names
    // These include: \ / : * ? " < > |
    return fileName.replace(/[\\/:*?"<>|]/g, "-");
  }

  /**
   * Ensure a folder exists, creating it if necessary
   */
  async ensureFolderExists(folderPath: string, folderType: string): Promise<boolean> {
    const exists = await this.app.vault.adapter.exists(folderPath);

    if (!exists) {
      const result = await createFolderModal(this.app, folderType, folderPath);
      if (!result) {
        this.notificationService.showWarning(
          `No ${folderType} found. Create it or choose an existing folder in settings.`
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Create a new file with the given content
   */
  async createNewFile(filePath: string, content: string): Promise<TFile> {
    return this.app.vault.create(filePath, content);
  }

  /**
   * Read the contents of a file
   */
  async readFile(file: TFile): Promise<string> {
    return this.app.vault.read(file);
  }

  /**
   * Get the content of a linked note
   */
  async getLinkedNoteContent(linkPath: string): Promise<string | null> {
    try {
      const file = this.app.metadataCache.getFirstLinkpathDest(linkPath, "");
      return file ? await this.app.vault.read(file) : null;
    } catch (error) {
      Logger.error(`Error reading linked note: ${linkPath}`, { error });
      return null;
    }
  }

  /**
   * Format a date according to the given format
   */
  formatDate(date: Date, format: string): string {
    const values: Record<string, string> = {
      YYYY: String(date.getFullYear()).padStart(4, "0"),
      MM: String(date.getMonth() + 1).padStart(2, "0"),
      DD: String(date.getDate()).padStart(2, "0"),
      hh: String(date.getHours()).padStart(2, "0"),
      mm: String(date.getMinutes()).padStart(2, "0"),
      ss: String(date.getSeconds()).padStart(2, "0"),
    };

    return format.replace(/YYYY|MM|DD|hh|mm|ss/g, (token) => values[token]);
  }
}
