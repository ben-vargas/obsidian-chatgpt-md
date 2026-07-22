import { ChatGPT_MDSettings } from "src/Models/Config";
import { ProviderType } from "./ProviderAdapter";
import { BaseProviderAdapter } from "./BaseProviderAdapter";

/**
 * Adapter for Google Gemini API provider
 * Encapsulates Gemini-specific logic and configuration
 */
export class GeminiAdapter extends BaseProviderAdapter {
  readonly type: ProviderType = "gemini";
  readonly displayName = "Gemini";

  override getApiPathSuffix(url?: string): string {
    return url?.replace(/\/+$/, "").endsWith("/v1beta") ? "" : "/v1beta";
  }

  getAuthHeaders(apiKey: string): Record<string, string> {
    // Gemini uses API key as query parameter, not in headers
    return {
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
      // Gemini API key is passed as query parameter
      const baseUrl = url.replace(/\/+$/, "");
      const modelsUrl = `${baseUrl}${this.getApiPathSuffix(baseUrl)}/models?key=${apiKey}`;
      const headers = this.getAuthHeaders(apiKey!); // Non-null assertion: validated above
      const response = await makeGetRequest(modelsUrl, headers, this.type);

      return this.getObjectArray(response, "models")
        .map((model) => model.name)
        .filter((name): name is string => typeof name === "string" && name.includes("generate"))
        .map((name) => name.split("/").pop())
        .filter((modelId): modelId is string => Boolean(modelId))
        .map((modelId) => this.prefixModelId(modelId))
        .sort();
    } catch (error) {
      this.handleFetchError(error);
      return [];
    }
  }
}
