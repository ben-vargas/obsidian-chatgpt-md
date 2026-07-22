import { ChatGPT_MDSettings } from "src/Models/Config";
import { ProviderType } from "./ProviderAdapter";
import { BaseProviderAdapter } from "./BaseProviderAdapter";

/**
 * Adapter for OpenRouter API provider
 * Encapsulates OpenRouter-specific logic and configuration
 */
export class OpenRouterAdapter extends BaseProviderAdapter {
  readonly type: ProviderType = "openrouter";
  readonly displayName = "OpenRouter";

  getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * OpenRouter requires /api/v1 prefix for all endpoints
   *
   * This is combined with the base URL to form the complete baseURL passed to the AI SDK:
   * - Base URL: https://openrouter.ai (from DEFAULT_OPENROUTER_CONFIG.url)
   * - Path suffix: /api/v1 (this method)
   * - Result: https://openrouter.ai/api/v1 (passed as baseURL to createOpenRouter)
   * - Final endpoint: https://openrouter.ai/api/v1/chat/completions (AI SDK appends /chat/completions)
   *
   * @param url - Optional URL parameter (ignored by OpenRouter)
   * @returns The API path prefix required by OpenRouter
   */
  override getApiPathSuffix(url?: string): string {
    return url?.replace(/\/+$/, "").endsWith("/api/v1") ? "" : "/api/v1";
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
      const apiPath = this.getApiPathSuffix(url);
      const response = await makeGetRequest(`${url}${apiPath}/models`, headers, this.type);
      const modelIds = this.getObjectArray(response, "data")
        .map((model) => model.id)
        .filter((id): id is string => typeof id === "string");

      return modelIds.sort((a, b) => b.localeCompare(a)).map((id) => this.prefixModelId(id));
    } catch (error) {
      this.handleFetchError(error);
      return [];
    }
  }
}
