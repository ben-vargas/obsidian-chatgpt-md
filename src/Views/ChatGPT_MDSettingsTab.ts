import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { ChatGPT_MDSettings } from "src/Models/Config";
import { COLLAPSIBLE_GROUPS, createSettingsSchema, SettingDefinition } from "./settingsSchema";

interface SettingsProvider {
  settings: ChatGPT_MDSettings;
  saveSettings: () => Promise<void>;
}

export class ChatGPT_MDSettingsTab extends PluginSettingTab {
  settingsProvider: SettingsProvider;

  constructor(app: App, plugin: Plugin, settingsProvider: SettingsProvider) {
    super(app, plugin);
    this.settingsProvider = settingsProvider;
  }

  /**
   * Type-safe helper method to update settings
   */
  private updateSetting<K extends keyof ChatGPT_MDSettings>(key: K, value: ChatGPT_MDSettings[K]): void {
    this.settingsProvider.settings[key] = value;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const settingsSchema = createSettingsSchema(this.settingsProvider.settings);

    // Group settings by category
    const groupedSettings: Record<string, SettingDefinition[]> = {};
    settingsSchema.forEach((setting) => {
      if (!groupedSettings[setting.group]) {
        groupedSettings[setting.group] = [];
      }
      groupedSettings[setting.group].push(setting);
    });

    // Separate collapsible and non-collapsible groups
    const collapsibleGroups: Record<string, SettingDefinition[]> = {};
    const regularGroups: Record<string, SettingDefinition[]> = {};

    Object.entries(groupedSettings).forEach(([group, settings]) => {
      if (COLLAPSIBLE_GROUPS.includes(group)) {
        collapsibleGroups[group] = settings;
      } else {
        regularGroups[group] = settings;
      }
    });

    // Render API Keys first (always visible)
    if (regularGroups["API Keys"]) {
      this.renderGroupHeader(containerEl, "API Keys");
      regularGroups["API Keys"].forEach((setting) => {
        this.createSettingElement(containerEl, setting);
      });
      containerEl.createEl("hr");
      delete regularGroups["API Keys"];
    }

    // Render Chat Behavior (always visible)
    if (regularGroups["Chat Behavior"]) {
      this.renderGroupHeader(containerEl, "Chat Behavior");
      regularGroups["Chat Behavior"].forEach((setting) => {
        this.createSettingElement(containerEl, setting);
      });
      containerEl.createEl("hr");
      delete regularGroups["Chat Behavior"];
    }

    // Render collapsible provider settings section
    if (Object.keys(collapsibleGroups).length > 0) {
      this.renderGroupHeader(containerEl, "Provider Settings");
      const providerNote = containerEl.createEl("p", {
        text: "Configure default settings for each AI provider. Click to expand.",
        cls: "setting-item-description",
      });
      providerNote.style.marginTop = "-10px";
      providerNote.style.marginBottom = "15px";

      // Create collapsible sections for each provider
      Object.entries(collapsibleGroups).forEach(([group, settings]) => {
        this.renderCollapsibleGroup(containerEl, group, settings);
      });

      containerEl.createEl("hr");
    }

    // Render remaining regular groups
    Object.entries(regularGroups).forEach(([group, settings]) => {
      this.renderGroupHeader(containerEl, group);
      settings.forEach((setting) => {
        this.createSettingElement(containerEl, setting);
      });
      containerEl.createEl("hr");
    });
  }

  /**
   * Render a group header (h3)
   */
  private renderGroupHeader(container: HTMLElement, title: string): void {
    container.createEl("h3", { text: title });
  }

  /**
   * Render a collapsible group using details/summary elements
   */
  private renderCollapsibleGroup(container: HTMLElement, group: string, settings: SettingDefinition[]): void {
    const details = container.createEl("details", { cls: "chatgpt-md-collapsible-group" });
    details.style.marginBottom = "10px";
    details.style.border = "1px solid var(--background-modifier-border)";
    details.style.borderRadius = "5px";
    details.style.padding = "0";

    const summary = details.createEl("summary", { text: group });
    summary.style.padding = "10px 15px";
    summary.style.cursor = "pointer";
    summary.style.fontWeight = "600";
    summary.style.backgroundColor = "var(--background-secondary)";
    summary.style.borderRadius = "5px";
    summary.style.userSelect = "none";

    const content = details.createEl("div", { cls: "chatgpt-md-collapsible-content" });
    content.style.padding = "10px 15px";

    settings.forEach((setting) => {
      this.createSettingElement(content, setting);
    });
  }

  createSettingElement(container: HTMLElement, schema: SettingDefinition) {
    // Regular handling for all settings
    const setting = new Setting(container).setName(schema.name).setDesc(schema.description);

    if (schema.type === "text") {
      setting.addText((text) => {
        text
          .setPlaceholder(schema.placeholder || "")
          .setValue(String(this.settingsProvider.settings[schema.id]))
          .onChange(async (value) => {
            // Type-safe update for string settings
            this.updateSetting(schema.id, value as ChatGPT_MDSettings[typeof schema.id]);
            await this.settingsProvider.saveSettings();
          });

        // Set width to match textarea
        text.inputEl.style.width = "300px";

        return text;
      });
    } else if (schema.type === "textarea") {
      setting.addTextArea((text) => {
        text
          .setPlaceholder(schema.placeholder || "")
          .setValue(String(this.settingsProvider.settings[schema.id] || schema.placeholder))
          .onChange(async (value) => {
            // Type-safe update for string settings
            this.updateSetting(schema.id, value as ChatGPT_MDSettings[typeof schema.id]);
            await this.settingsProvider.saveSettings();
          });

        text.inputEl.style.width = "300px";

        if (schema.id === "defaultChatFrontmatter" || schema.id === "pluginSystemMessage") {
          text.inputEl.style.height = "260px";
          text.inputEl.style.minHeight = "260px";
        }

        if (schema.id === "toolEnabledModels") {
          text.inputEl.style.height = "200px";
          text.inputEl.style.minHeight = "200px";
        }

        return text;
      });
    } else if (schema.type === "toggle") {
      setting.addToggle((toggle) =>
        toggle.setValue(Boolean(this.settingsProvider.settings[schema.id])).onChange(async (value) => {
          // Type-safe update for boolean settings
          this.updateSetting(schema.id, value as ChatGPT_MDSettings[typeof schema.id]);
          await this.settingsProvider.saveSettings();
        })
      );
    } else if (schema.type === "dropdown" && schema.options) {
      setting.addDropdown((dropdown) => {
        dropdown.addOptions(schema.options || {});
        dropdown.setValue(String(this.settingsProvider.settings[schema.id]));
        dropdown.onChange(async (value) => {
          // Type-safe update for string settings
          this.updateSetting(schema.id, value as ChatGPT_MDSettings[typeof schema.id]);
          await this.settingsProvider.saveSettings();
        });

        // Set width to match textarea
        dropdown.selectEl.style.width = "300px";

        return dropdown;
      });
    }
  }
}
