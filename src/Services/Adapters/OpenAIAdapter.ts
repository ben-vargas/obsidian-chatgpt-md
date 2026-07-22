import { ChatGPT_MDSettings } from "src/Models/Config";
import { ProviderType } from "./ProviderAdapter";
import { BaseProviderAdapter } from "./BaseProviderAdapter";

/**
 * Adapter for OpenAI API provider
 * Encapsulates OpenAI-specific logic and configuration
 */
export class OpenAIAdapter extends BaseProviderAdapter {
  readonly type: ProviderType = "openai";
  readonly displayName = "OpenAI";

  getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async fetchModels(
    url: string,
    apiKey: string | undefined,
    settings: ChatGPT_MDSettings | undefined,
    makeGetRequest: (url: string, headers: Record<string, string>, provider: string) => Promise<unknown>
  ): Promise<string[]> {
    if (!this.validateApiKey(apiKey)) {
      return [];
    }

    try {
      const headers = this.getAuthHeaders(apiKey!); // Non-null assertion: validated above
      const response = await makeGetRequest(`${url}/v1/models`, headers, this.type);
      const modelIds = this.getObjectArray(response, "data")
        .map((model) => model.id)
        .filter((id): id is string => typeof id === "string" && this.isValidChatModel(id));

      return modelIds.sort((a, b) => b.localeCompare(a)).map((id) => this.prefixModelId(id));
    } catch (error) {
      this.handleFetchError(error);
      return [];
    }
  }

  /**
   * Filter predicate for valid OpenAI chat models
   * Excludes audio, transcription, realtime, and TTS models
   */
  private isValidChatModel(id: string): boolean {
    const isGenerationModel =
      id.includes("o3") ||
      id.includes("o4") ||
      id.includes("o1") ||
      id.includes("gpt-4") ||
      id.includes("gpt-5") ||
      id.includes("gpt-3");

    const isExcluded =
      id.includes("audio") ||
      id.includes("transcribe") ||
      id.includes("realtime") ||
      id.includes("o1-pro") ||
      id.includes("tts");

    return isGenerationModel && !isExcluded;
  }
}
