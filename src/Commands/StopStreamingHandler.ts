import { ServiceContainer } from "src/core/ServiceContainer";
import { STOP_STREAMING_COMMAND_ID } from "src/Constants";
import { CallbackCommandHandler, CommandMetadata } from "./CommandHandler";

/**
 * Handler for stopping streaming responses
 */
export interface AbortableAiService {
  stopStreaming(): void;
}

export class StopStreamingHandler implements CallbackCommandHandler {
  private currentAiService: AbortableAiService | null = null;

  constructor(private services: ServiceContainer) {}

  setCurrentAiService(aiService: AbortableAiService): void {
    this.currentAiService = aiService;
  }

  clearCurrentAiService(aiService: AbortableAiService): void {
    if (this.currentAiService === aiService) this.currentAiService = null;
  }

  execute(): void {
    // Use the aiService's stopStreaming method if available
    if (this.currentAiService) {
      this.currentAiService.stopStreaming();
    } else {
      // No active AI service to stop streaming
      this.services.notificationService.showWarning("No active streaming request to stop");
    }
  }

  getCommand(): CommandMetadata {
    return {
      id: STOP_STREAMING_COMMAND_ID,
      name: "Stop streaming",
      icon: "octagon",
    };
  }
}
