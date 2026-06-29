import { Editor, MarkdownView } from "obsidian";
import { ServiceContainer } from "src/core/ServiceContainer";
import { AiModelSuggestModal } from "src/Views/AiModelSuggestModel";
import { AI_SERVICE_OPENAI, AI_SERVICE_OPENROUTER } from "src/Constants";
import { getProviderDefinitions } from "src/Services/Providers/ProviderRegistry";
import { fetchAvailableModels, getAiApiUrls, getDefaultApiUrls } from "./CommandUtilities";

/**
 * Handler for the model selection command
 */
export class ModelSelectHandler {
  private availableModels: string[] = [];

  constructor(private services: ServiceContainer) {}

  static getCommand() {
    return {
      id: "select-model-command",
      name: "Select Model",
      icon: "list",
    };
  }

  /**
   * Execute the model selection command
   */
  async execute(editor: Editor, view: MarkdownView | any): Promise<void> {
    const { editorService, settingsService, apiAuthService } = this.services;
    const settings = settingsService.getSettings();

    // --- Step 1: Open modal immediately with cached models ---
    const initialModal = new AiModelSuggestModal(
      this.services.app,
      editor,
      editorService,
      this.availableModels, // Use potentially stale but instantly available models
      settings
    );
    initialModal.open();

    // --- Step 2: Fetch fresh models asynchronously ---
    void (async () => {
      try {
        const frontmatter = await editorService.getFrontmatter(view, settings, this.services.app);
        const openAiKey = apiAuthService.getApiKey(settings, AI_SERVICE_OPENAI);
        const openRouterKey = apiAuthService.getApiKey(settings, AI_SERVICE_OPENROUTER);

        const frontmatterUrls = getAiApiUrls(frontmatter);
        const currentUrls = Object.fromEntries(
          getProviderDefinitions().map((provider) => [
            provider.id,
            String(frontmatter[provider.urlSetting] || settings[provider.urlSetting] || frontmatterUrls[provider.id]),
          ])
        );

        const aiService = this.services.aiProviderService();
        const freshModels = await fetchAvailableModels(
          aiService,
          currentUrls,
          openAiKey,
          openRouterKey,
          apiAuthService,
          settingsService
        );

        // --- Step 3: Compare and potentially update modal ---
        // Basic comparison: Check if lengths differ or if sets of models differ
        const currentModelsSet = new Set(this.availableModels);
        const freshModelsSet = new Set(freshModels);
        const areDifferent =
          this.availableModels.length !== freshModels.length ||
          ![...currentModelsSet].every((model) => freshModelsSet.has(model)) ||
          ![...freshModelsSet].every((model) => currentModelsSet.has(model));

        if (areDifferent && freshModels.length > 0) {
          this.availableModels = freshModels; // Update the stored models

          // Close the initial modal and open a new one with fresh data
          initialModal.close();
          new AiModelSuggestModal(this.services.app, editor, editorService, this.availableModels, settings).open();
        }
      } catch (e) {
        // Don't close the initial modal here, as it might still be useful
        // Just log the error for background fetching failure
        console.error("[ChatGPT MD] Error fetching fresh models in background:", e);
      }
    })(); // Self-invoking async function to run in background
  }

  /**
   * Get the cached available models list
   */
  getAvailableModels(): string[] {
    return this.availableModels;
  }

  /**
   * Initialize available models on plugin startup
   */
  async initializeAvailableModels(): Promise<void> {
    try {
      const { settingsService, apiAuthService } = this.services;
      const settings = settingsService.getSettings();
      const openAiKey = apiAuthService.getApiKey(settings, AI_SERVICE_OPENAI);
      const openRouterKey = apiAuthService.getApiKey(settings, AI_SERVICE_OPENROUTER);

      // Use default URLs for initialization, assuming frontmatter isn't available yet
      const defaultUrls = getDefaultApiUrls(settings);

      const aiService = this.services.aiProviderService();
      this.availableModels = await fetchAvailableModels(
        aiService,
        defaultUrls,
        openAiKey,
        openRouterKey,
        apiAuthService,
        settingsService
      );
    } catch (error) {
      console.error("[ChatGPT MD] Error initializing available models:", error);
      this.availableModels = []; // Ensure it's an empty array on error
    }
  }
}
