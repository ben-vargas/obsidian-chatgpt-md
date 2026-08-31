import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  SettingDefinitionItem,
  SettingDefinitionRender,
} from "obsidian";
import { ChatGPT_MDSettings } from "src/Models/Config";
import { ApiAuthService, isValidApiKey, isValidSecretId } from "src/Services/ApiAuthService";
import { CredentialDefinition, getCredentialDefinitions } from "src/Services/Providers/ProviderRegistry";
import { createSettingsSchema, SettingDefinition } from "./settingsSchema";
import { ConfirmationModal } from "./ConfirmationModal";

interface SettingsProvider {
  settings: ChatGPT_MDSettings;
  updateSettings: (settings: Partial<ChatGPT_MDSettings>) => void;
  saveSettings: () => Promise<void>;
  retryCredentialMigration: () => Promise<unknown>;
  deleteInsecureCredentialCopy: (definition: CredentialDefinition) => Promise<boolean>;
  apiAuthService: ApiAuthService;
}

const NUMERIC_RANGES: Partial<Record<keyof ChatGPT_MDSettings, { min: number; max: number }>> = {
  headingLevel: { min: 0, max: 6 },
  maxWebSearchResults: { min: 1, max: 10 },
  openaiDefaultTemperature: { min: 0, max: 2 },
  anthropicDefaultTemperature: { min: 0, max: 1 },
  geminiDefaultTemperature: { min: 0, max: 2 },
  openrouterDefaultTemperature: { min: 0, max: 2 },
  zaiDefaultTemperature: { min: 0, max: 1 },
  ollamaDefaultTemperature: { min: 0, max: 2 },
  lmstudioDefaultTemperature: { min: 0, max: 2 },
  openaiDefaultTopP: { min: 0, max: 1 },
  geminiDefaultTopP: { min: 0, max: 1 },
  openrouterDefaultTopP: { min: 0, max: 1 },
  ollamaDefaultTopP: { min: 0, max: 1 },
  lmstudioDefaultTopP: { min: 0, max: 1 },
  openaiDefaultPresencePenalty: { min: -2, max: 2 },
  openaiDefaultFrequencyPenalty: { min: -2, max: 2 },
  openrouterDefaultPresencePenalty: { min: -2, max: 2 },
  openrouterDefaultFrequencyPenalty: { min: -2, max: 2 },
  lmstudioDefaultPresencePenalty: { min: -2, max: 2 },
  lmstudioDefaultFrequencyPenalty: { min: -2, max: 2 },
};

export function parseSettingValue(schema: SettingDefinition, value: string | boolean): string | number | boolean {
  if (schema.valueType !== "number") return value;

  const parsedValue = typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  const range = NUMERIC_RANGES[schema.id];
  const outsideRange = range && (parsedValue < range.min || parsedValue > range.max);

  if (!Number.isFinite(parsedValue) || outsideRange) {
    const rangeDescription = range ? ` between ${range.min} and ${range.max}` : "";
    throw new Error(`${schema.name} must be a valid number${rangeDescription}.`);
  }

  return parsedValue;
}

export class ChatGPT_MDSettingsTab extends PluginSettingTab {
  settingsProvider: SettingsProvider;
  private migrationStarted = false;

  constructor(app: App, plugin: Plugin, settingsProvider: SettingsProvider) {
    super(app, plugin);
    this.settingsProvider = settingsProvider;
  }

  /**
   * Type-safe helper method to update settings
   */
  private updateSetting<K extends keyof ChatGPT_MDSettings>(key: K, value: ChatGPT_MDSettings[K]): void {
    this.settingsProvider.updateSettings({ [key]: value });
  }

  /**
   * Declarative settings API (Obsidian 1.13+): native rendering, grouping,
   * and settings search, driven by the shared settings schema. Per-row
   * controls are wired imperatively in populateSetting.
   */
  getSettingDefinitions(): SettingDefinitionItem[] {
    void this.ensureCredentialMigration();
    return this.buildSettingItems(createSettingsSchema(this.settingsProvider.settings));
  }

  /**
   * Retry the credential migration once per session, then re-render so
   * insecure-copy notices reflect the current state.
   */
  private async ensureCredentialMigration(): Promise<void> {
    if (this.migrationStarted) return;
    this.migrationStarted = true;
    try {
      await this.settingsProvider.retryCredentialMigration();
    } catch {
      new Notice("Some credentials could not be migrated. They remain available and will be retried.");
    } finally {
      this.update();
    }
  }

  private groupSettings(settingsSchema: SettingDefinition[]): Record<string, SettingDefinition[]> {
    const groups: Record<string, SettingDefinition[]> = {};
    for (const setting of settingsSchema) {
      groups[setting.group] = [...(groups[setting.group] || []), setting];
    }
    return groups;
  }

  private buildSettingItems(settingsSchema: SettingDefinition[]): SettingDefinitionItem[] {
    const groups = this.groupSettings(settingsSchema);
    const items: SettingDefinitionItem[] = [];

    const pushGroup = (heading: string, settings: SettingDefinition[] | undefined): void => {
      if (!settings?.length) return;
      items.push({ type: "group", heading, items: settings.map((setting) => this.toRenderDefinition(setting)) });
      delete groups[heading];
    };

    pushGroup("API Keys", groups["API Keys"]);
    pushGroup("Chat Behavior", groups["Chat Behavior"]);
    Object.entries(groups).forEach(([group, settings]) => pushGroup(group, settings));
    return items;
  }

  private toRenderDefinition(schema: SettingDefinition): SettingDefinitionRender {
    return {
      name: schema.name,
      desc: schema.description,
      render: (setting: Setting) => this.populateSetting(setting, schema),
    };
  }

  private populateSetting(setting: Setting, schema: SettingDefinition): void {
    if (schema.type === "text") this.addTextSetting(setting, schema);
    if (schema.type === "credential") this.addCredentialSetting(setting, schema);
    if (schema.type === "textarea") this.addTextareaSetting(setting, schema);
    if (schema.type === "toggle") this.addToggleSetting(setting, schema);
    if (schema.type === "dropdown" && schema.options) this.addDropdownSetting(setting, schema);
  }

  private addCredentialSetting(setting: Setting, schema: SettingDefinition): void {
    const SecretControl = this.settingsProvider.apiAuthService.getSecretComponentConstructor();
    if (!SecretControl || !schema.secretIdSetting) {
      this.addTextSetting(setting, schema);
      return;
    }

    const persistedReference = this.settingsProvider.settings[schema.secretIdSetting];
    const control = new SecretControl(this.app, setting.controlEl);
    control.setValue(isValidSecretId(persistedReference) ? persistedReference : "");
    control.onChange((value: unknown) => {
      void this.saveSecretReference(schema.secretIdSetting!, value, schema.name);
    });

    const definition = getCredentialDefinitions().find((item) => item.legacySetting === schema.id);
    if (definition) this.addInsecureCopyAction(setting, definition);
  }

  private addInsecureCopyAction(setting: Setting, definition: CredentialDefinition): void {
    const legacy = this.settingsProvider.settings[definition.legacySetting];
    if (
      !isValidApiKey(legacy) ||
      !this.settingsProvider.apiAuthService.hasValidReference(this.settingsProvider.settings, definition)
    ) {
      return;
    }

    setting.setDesc(
      `${definition.label} has an insecure plaintext copy in plugin data. The secure credential is already authoritative.`
    );
    setting.addButton((button) =>
      button
        .setButtonText("Delete insecure copy")
        .setDestructive()
        .onClick(() => {
          new ConfirmationModal(this.app, {
            title: "Delete insecure copy",
            body: `Delete the insecure ${definition.label} plaintext copy? The secure credential is unaffected.`,
            confirmText: "Delete insecure copy",
            onConfirm: async () => {
              try {
                if (await this.settingsProvider.deleteInsecureCredentialCopy(definition)) this.update();
              } catch {
                new Notice("The insecure copy could not be deleted and was retained.");
              }
            },
          }).open();
        })
    );
  }

  private async saveSecretReference(key: keyof ChatGPT_MDSettings, value: unknown, label: string): Promise<void> {
    if (value !== "" && !isValidSecretId(value)) {
      new Notice(`Invalid credential selection for ${label}`);
      return;
    }

    const previous = this.settingsProvider.settings[key];
    this.updateSetting(key, value);
    try {
      await this.settingsProvider.saveSettings();
    } catch {
      this.updateSetting(key, previous);
      new Notice(`Could not save credential selection for ${label}`);
    }
  }

  private addTextSetting(setting: Setting, schema: SettingDefinition): void {
    setting.addText((text) => {
      text
        .setPlaceholder(schema.placeholder || "")
        .setValue(String(this.settingsProvider.settings[schema.id]))
        .onChange((value) => this.saveSetting(schema, value));
      text.inputEl.addClass("chatgpt-md-setting-input");
      return text;
    });
  }

  private addTextareaSetting(setting: Setting, schema: SettingDefinition): void {
    setting.addTextArea((text) => {
      text
        .setPlaceholder(schema.placeholder || "")
        .setValue(String(this.settingsProvider.settings[schema.id] || schema.placeholder))
        .onChange((value) => this.saveSetting(schema, value));
      text.inputEl.addClass("chatgpt-md-setting-input");
      this.applyTextareaHeight(text.inputEl, schema);
      return text;
    });
  }

  private addToggleSetting(setting: Setting, schema: SettingDefinition): void {
    setting.addToggle((toggle) =>
      toggle
        .setValue(Boolean(this.settingsProvider.settings[schema.id]))
        .onChange((value) => this.saveSetting(schema, value))
    );
  }

  private addDropdownSetting(setting: Setting, schema: SettingDefinition): void {
    setting.addDropdown((dropdown) => {
      dropdown.addOptions(schema.options || {});
      dropdown.setValue(String(this.settingsProvider.settings[schema.id]));
      dropdown.onChange((value) => this.saveSetting(schema, value));
      dropdown.selectEl.addClass("chatgpt-md-setting-input");
      return dropdown;
    });
  }

  private applyTextareaHeight(inputEl: HTMLTextAreaElement, schema: SettingDefinition): void {
    if (schema.id === "defaultChatFrontmatter" || schema.id === "pluginSystemMessage") {
      inputEl.addClass("chatgpt-md-textarea-large");
    }

    if (schema.id === "toolEnabledModels") {
      inputEl.addClass("chatgpt-md-textarea-medium");
    }
  }

  private async saveSetting(schema: SettingDefinition, value: string | boolean): Promise<void> {
    try {
      const parsedValue = parseSettingValue(schema, value);
      this.updateSetting(schema.id, parsedValue);
      await this.settingsProvider.saveSettings();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : `Invalid value for ${schema.name}`);
    }
  }
}
