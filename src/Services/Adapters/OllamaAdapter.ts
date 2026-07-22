import { ChatGPT_MDSettings } from "src/Models/Config";
import { ProviderType } from "./ProviderAdapter";
import { BaseProviderAdapter } from "./BaseProviderAdapter";

/**
 * Adapter for Ollama (local) API provider
 * Encapsulates Ollama-specific logic and configuration
 */
export class OllamaAdapter extends BaseProviderAdapter {
  readonly type: ProviderType = "ollama";
  readonly displayName = "Ollama";

  getAuthHeaders(apiKey: string | undefined): Record<string, string> {
    // Ollama doesn't require authentication
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
      const response = await makeGetRequest(`${url}/api/tags`, headers, this.type);
      const modelNames = this.getObjectArray(response, "models")
        .map((model) => model.name)
        .filter((name): name is string => typeof name === "string");

      return modelNames.sort((a, b) => b.localeCompare(a)).map((name) => this.prefixModelId(name));
    } catch (error) {
      this.handleLocalFetchError(error);
      return [];
    }
  }

  requiresApiKey(): boolean {
    return false; // Ollama doesn't require API key
  }
}
