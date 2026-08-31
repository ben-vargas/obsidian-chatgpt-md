import { ChatGPT_MDSettings } from "src/Models/Config";
import { Logger } from "src/Utilities/Logger";
import { PLUGIN_SYSTEM_MESSAGE } from "src/Constants";

const ORIGINAL_PLUGIN_SYSTEM_MESSAGE = `You are an AI assistant integrated into Obsidian through the ChatGPT MD plugin. You are helping a user who is working within their Obsidian vault - a personal knowledge management system where they store notes, thoughts, and information in Markdown format.

Key context:
- The user is writing in Markdown format within Obsidian
- They may reference other notes in their vault using [[wiki links]] or standard [markdown links](url)
- Your responses will be inserted directly into their Markdown document
- Be concise but helpful, and format your responses appropriately for Markdown
- If you provide code examples, use proper markdown code blocks with language specification
- When suggesting organizational strategies, consider that this is within a personal knowledge management context
- The user may be taking notes, brainstorming, writing, researching, or organizing information

Code block formatting requirements:
- Code blocks must start and end with exactly 3 backticks (\`\`\`) on a new line
- There should be no whitespace before the opening or closing backticks
- The language name should be specified immediately after the opening backticks
- The actual code should start on a new line after the language specification
- Example format:
\`\`\`javascript
\`\`\`

Inline code formatting requirements:
- Use single backticks (\`) for inline code references like filenames (e.g., \`example.md\`), variable names (e.g., \`myVariable\`), or short code snippets referenced within a paragraph.
- Always ensure that single backticks are properly closed to avoid breaking Markdown rendering. For example, use \`code\` not \`code.

Table formatting requirements:
- Use standard Markdown table syntax.
- Tables should NOT be wrapped in code blocks.

Respond naturally and helpfully while being mindful of this Obsidian/note-taking context.`;

interface SettingsMigration {
  setting: keyof ChatGPT_MDSettings;
  pattern: RegExp;
  replacement: string;
  description: string;
  introducedIn: string;
}

const URL_MIGRATIONS: SettingsMigration[] = [
  {
    setting: "ollamaUrl",
    pattern: /\/api\/$/,
    replacement: "",
    description: "Removing trailing /api/ from Ollama URL",
    introducedIn: "2.1.3",
  },
  {
    setting: "openrouterUrl",
    pattern: /\/api\/$/,
    replacement: "",
    description: "Removing trailing /api/ from OpenRouter URL",
    introducedIn: "2.1.3",
  },
  {
    setting: "openaiUrl",
    pattern: /\/$/,
    replacement: "",
    description: "Removing trailing slash from OpenAI URL",
    introducedIn: "2.1.3",
  },
];

/** Applies idempotent migrations to the merged persisted settings object. */
export class SettingsMigrationService {
  migrateSettings(
    settings: ChatGPT_MDSettings,
    updateSettings: (newSettings: Partial<ChatGPT_MDSettings>) => void
  ): boolean {
    const urlUpdated = this.migrateUrlSettings(settings, updateSettings);
    const messageUpdated = this.migratePluginSystemMessage(settings, updateSettings);
    const updated = urlUpdated || messageUpdated;

    if (updated) Logger.debug("[ChatGPT MD] Settings migration completed");
    return updated;
  }

  private migrateUrlSettings(
    settings: ChatGPT_MDSettings,
    updateSettings: (newSettings: Partial<ChatGPT_MDSettings>) => void
  ): boolean {
    let updated = false;

    for (const migration of URL_MIGRATIONS) {
      const currentValue = settings[migration.setting];
      if (typeof currentValue !== "string" || !migration.pattern.test(currentValue)) continue;

      updateSettings({
        [migration.setting]: currentValue.replace(migration.pattern, migration.replacement),
      });
      Logger.debug(`[ChatGPT MD] Migration (${migration.introducedIn}): ${migration.description}`);
      updated = true;
    }

    return updated;
  }

  private migratePluginSystemMessage(
    settings: ChatGPT_MDSettings,
    updateSettings: (newSettings: Partial<ChatGPT_MDSettings>) => void
  ): boolean {
    if (settings.pluginSystemMessage?.trim() !== ORIGINAL_PLUGIN_SYSTEM_MESSAGE.trim()) return false;

    updateSettings({ pluginSystemMessage: PLUGIN_SYSTEM_MESSAGE });
    Logger.debug("[ChatGPT MD] Plugin system message migrated to concise version (v2.8.1)");
    return true;
  }
}
