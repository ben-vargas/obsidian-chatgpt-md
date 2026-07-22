import { ChatGPT_MDSettings } from "src/Models/Config";
import { ProviderType } from "./ProviderAdapter";
import { BaseProviderAdapter } from "./BaseProviderAdapter";

/**
 * Adapter for LM Studio (local) API provider
 * Encapsulates LM Studio-specific logic and configuration
 * Uses OpenAI-compatible API format
 */
export class LmStudioAdapter extends BaseProviderAdapter {
  readonly type: ProviderType = "lmstudio";
  readonly displayName = "LM Studio";

  getAuthHeaders(apiKey: string | undefined): Record<string, string> {
    // LM Studio doesn't require authentication
    return { "Content-Type": "application/json" };
  }

  async fetchModels(
    url: string,
    apiKey: string | undefined,
    settings: ChatGPT_MDSettings | undefined,
    makeGetRequest: (url: string, headers: Record<string, string>, provider: string) => Promise<unknown>
  ): Promise<string[]> {
    try {
      const headers = this.getAuthHeaders(apiKey);
      const response = await makeGetRequest(`${url}/v1/models`, headers, this.type);
      return this.getObjectArray(response, "data")
        .map((model) => model.id)
        .filter((id): id is string => typeof id === "string")
        .map((id) => this.prefixModelId(id))
        .sort();
    } catch (error) {
      this.handleLocalFetchError(error);
      return [];
    }
  }

  requiresApiKey(): boolean {
    return false; // LM Studio doesn't require API key
  }
}
