import { App, TFile } from "obsidian";
import { Logger } from "src/Utilities/Logger";

/**
 * Focused wrapper around Obsidian's frontmatter APIs.
 */
export class FrontmatterManager {
  constructor(private readonly app: App) {}

  /**
   * Read a copy of cached frontmatter so callers cannot mutate Obsidian's cache.
   */
  readFrontmatter(file: TFile): Record<string, unknown> | null {
    try {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      return frontmatter ? { ...frontmatter } : null;
    } catch (error) {
      Logger.error("[FrontmatterManager] Error reading frontmatter", { error });
      return null;
    }
  }

  /**
   * Update one field using Obsidian's atomic frontmatter processor.
   */
  async updateFrontmatterField(file: TFile, key: string, value: unknown): Promise<void> {
    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter[key] = value;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error("[FrontmatterManager] Error updating frontmatter field", { error });
      throw new Error(`Failed to update frontmatter field '${key}': ${message}`);
    }
  }
}
