import { Editor, MarkdownView, Notice } from "obsidian";
import { ServiceContainer } from "src/core/ServiceContainer";
import { AI_SERVICE_OPENROUTER, INFER_TITLE_COMMAND_ID } from "src/Constants";
import { getAiApiUrls } from "./CommandUtilities";
import { CommandMetadata, EditorViewCommandHandler, StatusBarManager } from "./CommandHandler";
import { AbortableAiService } from "./StopStreamingHandler";

/**
 * Handler for inferring titles from conversations
 */
export class InferTitleHandler implements EditorViewCommandHandler {
  private statusBarManager: StatusBarManager;

  constructor(
    private services: ServiceContainer,
    private stopStreamingHandler: {
      setCurrentAiService: (aiService: AbortableAiService) => void;
      clearCurrentAiService: (aiService: AbortableAiService) => void;
    }
  ) {
    this.statusBarManager = new StatusBarManager(services.plugin);
  }

  async execute(editor: Editor, view: MarkdownView): Promise<void> {
    const { editorService, settingsService, apiAuthService } = this.services;
    const settings = settingsService.getSettings();

    // Get frontmatter
    const frontmatter = await editorService.getFrontmatter(view);
    const aiService = this.services.aiProviderService();

    // Ensure model is set
    if (!frontmatter.model) {
      new Notice("Model not set in frontmatter. Please configure a model in settings or frontmatter.");
      return;
    }

    this.statusBarManager.setText(`Calling ${frontmatter.model}`);
    this.stopStreamingHandler.setCurrentAiService(aiService);

    try {
      const { messages } = await editorService.getMessagesFromEditor(editor, settings);
      const settingsWithApiKey = {
        ...settings,
        ...frontmatter,
        openrouterApiKey: apiAuthService.getApiKey(settings, AI_SERVICE_OPENROUTER),
        url: frontmatter.url || getAiApiUrls(frontmatter)[frontmatter.aiService],
      };

      await aiService.inferTitle(view, settingsWithApiKey, messages, editorService);
    } finally {
      this.stopStreamingHandler.clearCurrentAiService(aiService);
      this.statusBarManager.clear();
    }
  }

  getCommand(): CommandMetadata {
    return {
      id: INFER_TITLE_COMMAND_ID,
      name: "Infer title",
      icon: "subtitles",
    };
  }
}
