import { ChatGPT_MDSettings } from "src/Models/Config";
import { Logger } from "src/Utilities/Logger";
import { ProviderAdapter, ProviderType } from "./ProviderAdapter";

/**
 * Abstract base class for provider adapters
 * Implements common functionality shared across all providers
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract readonly type: ProviderType;
  abstract readonly displayName: string;

  /**
   * Get authentication headers for API requests
   */
  abstract getAuthHeaders(apiKey: string): Record<string, string>;

  /**
   * Fetch available models from this provider
   */
  abstract fetchModels(
    url: string,
    apiKey: string | undefined,
    settings: ChatGPT_MDSettings | undefined,
    makeGetRequest: (url: string, headers: Record<string, string>, provider: string) => Promise<unknown>
  ): Promise<string[]>;

  /**
   * Whether this provider requires an API key
   * Default: true (Ollama and LM Studio override to false)
   */
  requiresApiKey(): boolean {
    return true;
  }

  /**
   * Extract the model name from a full model ID with provider prefix
   * Common implementation for all providers
   */
  extractModelName(modelId: string): string {
    // Remove provider prefix if present
    if (modelId.startsWith(`${this.type}@`)) {
      return modelId.substring(this.type.length + 1);
    }
    return modelId;
  }

  /**
   * Add provider prefix to model ID
   * Common implementation for all providers
   */
  protected prefixModelId(modelId: string): string {
    return `${this.type}@${modelId}`;
  }

  /**
   * Handle fetch models error with consistent logging
   */
  protected handleFetchError(error: unknown, customMessage?: string): void {
    const errorMessage = customMessage || `Error fetching ${this.displayName} models`;
    Logger.error(errorMessage, { error });
  }

  /**
   * Connection refusal is expected when an optional local provider is not running.
   * Keep it available for diagnostics without presenting it as an application error.
   */
  protected handleLocalFetchError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);

    if (/ERR_CONNECTION_REFUSED|ECONNREFUSED/i.test(message)) {
      Logger.debug(`[ChatGPT MD] ${this.displayName} is not running; skipping model discovery.`);
      return;
    }

    this.handleFetchError(error);
  }

  /**
   * Validate API key is present
   */
  protected getObjectArray(response: unknown, key: string): Array<Record<string, unknown>> {
    if (!response || typeof response !== "object") return [];
    const value = (response as Record<string, unknown>)[key];
    return Array.isArray(value)
      ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      : [];
  }

  protected validateApiKey(apiKey: string | undefined): boolean {
    if (!apiKey && this.requiresApiKey()) {
      Logger.error(`${this.displayName} API key is missing. Please add it in settings.`);
      return false;
    }
    return true;
  }

  /**
   * Default API path suffix for chat completions
   * Most OpenAI-compatible providers use "/v1"
   * @param url - Optional URL parameter (ignored by most providers)
   */
  getApiPathSuffix(url?: string): string {
    return url?.replace(/\/+$/, "").endsWith("/v1") ? "" : "/v1";
  }
}
