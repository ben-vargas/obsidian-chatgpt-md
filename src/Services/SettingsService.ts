import { MarkdownView, Plugin, TFile } from "obsidian";
import { ChatGPT_MDSettings, DEFAULT_SETTINGS, MergedFrontmatterConfig } from "src/Models/Config";
import { ChatGPT_MDSettingsTab } from "../Views/ChatGPT_MDSettingsTab";
import { NotificationService } from "./NotificationService";
import { SettingsMigrationService } from "./SettingsMigration";
import { FrontmatterManager } from "./FrontmatterManager";
import { parseSettingsFrontmatter } from "src/Utilities/YamlHelpers";
import { getDefaultConfigForService } from "src/Utilities/FrontmatterHelpers";
import { aiProviderFromKeys, aiProviderFromUrl } from "src/Utilities/ProviderHelpers";
import type { AgentService } from "./AgentService";
import { AI_SERVICE_OPENAI } from "src/Constants";
import { findProviderDefinition, getProviderFrontmatterFields } from "./Providers/ProviderRegistry";
import { Logger } from "src/Utilities/Logger";

/**
 * Manages plugin settings with persistence
 * Now includes frontmatter operations (merged from FrontmatterService)
 */
export class SettingsService {
  private settings: ChatGPT_MDSettings;
  private migrationService: SettingsMigrationService;

  constructor(
    private readonly plugin: Plugin,
    private readonly frontmatterManager: FrontmatterManager,
    private readonly agentService: AgentService,
    private readonly notificationService: NotificationService
  ) {
    this.migrationService = new SettingsMigrationService();
    this.settings = structuredClone(DEFAULT_SETTINGS);
  }

  /**
   * Get current settings
   */
  getSettings(): ChatGPT_MDSettings {
    return this.settings;
  }

  /**
   * Migrate settings from older versions
   */
  async migrateSettings(): Promise<void> {
    const needsUpdate = this.migrationService.migrateSettings(this.settings, this.updateSettings.bind(this));

    // Save settings if any changes were made
    if (needsUpdate) {
      await this.saveSettings();
    }
  }

  /**
   * Load settings from plugin data
   */
  async loadSettings(): Promise<ChatGPT_MDSettings> {
    const loadedData = await this.plugin.loadData();
    Object.assign(this.settings, DEFAULT_SETTINGS, loadedData);
    Logger.setDebugEnabled(this.settings.debugMode);
    return this.settings;
  }

  /**
   * Save settings to plugin data
   */
  async saveSettings(): Promise<void> {
    await this.plugin.saveData(this.settings);
  }

  /**
   * Update settings with new values
   */
  updateSettings(newSettings: Partial<ChatGPT_MDSettings>): void {
    Object.assign(this.settings, newSettings);
    Logger.setDebugEnabled(this.settings.debugMode);
  }

  /**
   * Add settings tab to the plugin
   */
  async addSettingTab(): Promise<void> {
    // Create the settings tab with the already loaded settings
    this.plugin.addSettingTab(
      new ChatGPT_MDSettingsTab(this.plugin.app, this.plugin, {
        settings: this.settings,
        updateSettings: this.updateSettings.bind(this),
        saveSettings: this.saveSettings.bind(this),
      })
    );
  }

  // ========== Frontmatter Operations (merged from FrontmatterService) ==========

  /**
   * Get frontmatter from a markdown view using FrontmatterManager
   */
  async getFrontmatter(view: MarkdownView): Promise<MergedFrontmatterConfig> {
    let frontmatter: Record<string, unknown> = {};

    // Use FrontmatterManager to get frontmatter
    if (view.file) {
      const fileFrontmatter = this.frontmatterManager.readFrontmatter(view.file);
      if (fileFrontmatter) {
        frontmatter = { ...fileFrontmatter };
      }
    }

    // Parse default frontmatter from settings
    const defaultFrontmatter = this.settings.defaultChatFrontmatter
      ? parseSettingsFrontmatter(this.settings.defaultChatFrontmatter)
      : {};

    // Resolve agent if referenced in note frontmatter
    const agentFrontmatter = await this.resolveAgentFrontmatter(frontmatter);

    // Merge configurations with proper priority order
    // Priority: defaultConfig < defaultFrontmatter < settings < agentFrontmatter < frontmatter
    const merged: Record<string, unknown> & Partial<MergedFrontmatterConfig> = {
      ...defaultFrontmatter,
      ...this.settings,
      ...agentFrontmatter,
      ...frontmatter,
    };

    // Determine AI service
    const aiService =
      (merged.aiService as string | undefined) ||
      aiProviderFromUrl(merged.url as string | undefined, merged.model as string | undefined) ||
      aiProviderFromKeys(merged as Record<string, unknown>) ||
      AI_SERVICE_OPENAI;

    // Get default config for the determined service
    const defaultConfig = getDefaultConfigForService(aiService);

    // Return final configuration with everything merged
    // Priority order: defaultConfig < defaultFrontmatter < settings < agentFrontmatter < frontmatter
    const providerDefinition = findProviderDefinition(aiService);
    const providerSettings = getProviderFrontmatterFields(aiService, this.settings);
    const explicitUrl = frontmatter.url ?? agentFrontmatter.url ?? defaultFrontmatter.url;
    const providerUrl = providerDefinition ? merged[providerDefinition.urlSetting] : undefined;
    const effectiveUrl = this.firstNonEmptyString(explicitUrl, providerUrl, defaultConfig.url);

    const finalConfig = {
      ...defaultConfig,
      ...defaultFrontmatter,
      ...this.settings,
      ...providerSettings,
      ...agentFrontmatter,
      ...frontmatter,
      aiService,
      url: effectiveUrl,
    };

    // Cast to MergedFrontmatterConfig - at this point we have all necessary fields from defaults and merging
    return finalConfig as unknown as MergedFrontmatterConfig;
  }

  private firstNonEmptyString(...values: unknown[]): string {
    return values.find((value): value is string => typeof value === "string" && value.trim().length > 0) || "";
  }

  /**
   * Resolve agent frontmatter and body if an agent is referenced in the note.
   * Returns agent frontmatter (excluding position) with _agentSystemMessage attached.
   */
  private async resolveAgentFrontmatter(noteFrontmatter: Record<string, unknown>): Promise<Record<string, unknown>> {
    const agentName = noteFrontmatter.agent as string | undefined;
    if (!agentName) return {};

    const agent = await this.agentService.resolveAgentByName(agentName, this.settings);
    if (!agent) return {};

    // Exclude 'position' key from agent frontmatter (Obsidian metadata)
    const { position: _, ...agentFields } = agent.frontmatter;

    // Attach agent body as a transient field consumed by ChatHandler
    if (agent.body) {
      agentFields._agentSystemMessage = agent.body;
    }

    return agentFields;
  }

  /**
   * Update a field in the frontmatter of a file using FrontmatterManager
   * @param editor The editor instance
   * @param key The key to update
   * @param value The new value
   */
  async updateFrontmatterField(key: string, value: unknown): Promise<void> {
    // Get the active file
    const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView || !activeView.file) {
      Logger.error("[ChatGPT MD] No active file found for frontmatter update");
      return;
    }

    const file: TFile = activeView.file;

    try {
      // Use FrontmatterManager to update the field
      await this.frontmatterManager.updateFrontmatterField(file, key, value);
    } catch (error) {
      Logger.error("[ChatGPT MD] Error updating frontmatter", { error });
      throw error;
    }
  }
}
