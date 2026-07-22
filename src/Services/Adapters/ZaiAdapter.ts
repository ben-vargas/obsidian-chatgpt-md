import { ChatGPT_MDSettings } from "src/Models/Config";
import { ProviderType } from "./ProviderAdapter";
import { BaseProviderAdapter } from "./BaseProviderAdapter";

/**
 * Adapter for Z.AI API provider
 * Encapsulates Z.AI-specific logic and configuration
 *
 * Uses createOpenAICompatible to avoid V2/V3 specification compatibility warnings.
 *
 * Supports two API modes:
 * - Standard API (OpenAI-compatible): /api/paas/v4 - Pay-per-token
 * - Coding Plan API (Anthropic-compatible): /api/anthropic - Subscription-based
 *
 * The API mode is determined by the URL configured in settings:
 * - URLs containing "anthropic" use Coding Plan mode
 * - All other URLs use Standard mode (default)
 *
 * Z.AI does not provide a models endpoint, so we return known models directly.
 */
export class ZaiAdapter extends BaseProviderAdapter {
  readonly type: ProviderType = "zai";
  readonly displayName = "Z.AI";

  /**
   * Known Z.AI models
   * Z.AI API does not have a models endpoint, so we return this list directly
   */
  private readonly KNOWN_MODELS = [
    "glm-4.5",
    "glm-4.6",
    "glm-4.6v",
    "glm-4.6v-flash",
    "glm-4.6v-flashx",
    "glm-4.7",
    "glm-4.7-flash",
  ];

  /**
   * Check if the URL points to the Anthropic-compatible Coding Plan endpoint
   * Detection based on URL path containing "anthropic"
   */
  isAnthropicMode(url: string): boolean {
    return url.includes("/api/anthropic");
  }

  getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Get the API path suffix for the provider
   * For Standard API mode: return full path for Zhipu provider
   * For Coding Plan (Anthropic-compatible): return the Anthropic path
   */
  override getApiPathSuffix(url?: string): string {
    const normalizedUrl = url?.replace(/\/+$/, "") || "";

    if (this.isAnthropicMode(normalizedUrl)) {
      return normalizedUrl.endsWith("/api/anthropic/v1") ? "" : "/v1";
    }

    return normalizedUrl.endsWith("/api/paas/v4") ? "" : "/api/paas/v4";
  }

  async fetchModels(
    _url: string,
    apiKey: string | undefined,
    _settings: ChatGPT_MDSettings | undefined,
    _makeGetRequest: (url: string, headers: Record<string, string>, provider: string) => Promise<unknown>
  ): Promise<string[]> {
    if (!this.validateApiKey(apiKey)) {
      return [];
    }

    // Z.AI does not have a models endpoint
    // Return known models directly
    return this.KNOWN_MODELS.map((model) => this.prefixModelId(model)).sort();
  }

  requiresApiKey(): boolean {
    return true; // Z.AI requires an API key
  }
}
