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

    const { regularGroups, collapsibleGroups } = this.groupSettings(settingsSchema);

    this.renderPriorityGroups(containerEl, regularGroups);
    this.renderProviderGroups(containerEl, collapsibleGroups);
    this.renderRemainingGroups(containerEl, regularGroups);
  }

  private groupSettings(settingsSchema: SettingDefinition[]): {
    regularGroups: Record<string, SettingDefinition[]>;
    collapsibleGroups: Record<string, SettingDefinition[]>;
  } {
    return settingsSchema.reduce(
      (groups, setting) => {
        const target = COLLAPSIBLE_GROUPS.includes(setting.group) ? groups.collapsibleGroups : groups.regularGroups;
        target[setting.group] = [...(target[setting.group] || []), setting];
        return groups;
      },
      { regularGroups: {}, collapsibleGroups: {} } as {
        regularGroups: Record<string, SettingDefinition[]>;
        collapsibleGroups: Record<string, SettingDefinition[]>;
      }
    );
  }

  private renderPriorityGroups(container: HTMLElement, regularGroups: Record<string, SettingDefinition[]>): void {
    this.renderRegularGroup(container, regularGroups, "API Keys");
    this.renderRegularGroup(container, regularGroups, "Chat Behavior");
  }

  private renderRegularGroup(
    container: HTMLElement,
    regularGroups: Record<string, SettingDefinition[]>,
    group: string
  ): void {
    const settings = regularGroups[group];
    if (!settings) return;

    this.renderGroupHeader(container, group);
    settings.forEach((setting) => this.createSettingElement(container, setting));
    container.createEl("hr");
    delete regularGroups[group];
  }

  private renderProviderGroups(container: HTMLElement, collapsibleGroups: Record<string, SettingDefinition[]>): void {
    if (Object.keys(collapsibleGroups).length === 0) return;

    this.renderGroupHeader(container, "Provider Settings");
    const providerNote = container.createEl("p", {
      text: "Configure default settings for each AI provider. Click to expand.",
      cls: "setting-item-description",
    });
    providerNote.style.marginTop = "-10px";
    providerNote.style.marginBottom = "15px";

    Object.entries(collapsibleGroups).forEach(([group, settings]) => {
      this.renderCollapsibleGroup(container, group, settings);
    });
    container.createEl("hr");
  }

  private renderRemainingGroups(container: HTMLElement, regularGroups: Record<string, SettingDefinition[]>): void {
    Object.keys(regularGroups).forEach((group) => this.renderRegularGroup(container, regularGroups, group));
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
