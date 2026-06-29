import { Notice } from "obsidian";
import { isValidApiKey } from "src/Services/ApiAuthService";
import { ChatGPT_MDSettings } from "src/Models/Config";
import { IAiApiService } from "src/Types/AiTypes";
import { FETCH_MODELS_TIMEOUT_MS } from "src/Constants";
import { getApiUrlsFromFrontmatter } from "src/Utilities/FrontmatterHelpers";
import { getProviderDefinitions, getProviderUrl } from "src/Services/Providers/ProviderRegistry";

/**
 * Get the API URLs for all AI services based on frontmatter
 * Delegates to FrontmatterHelpers utility
 */
export function getAiApiUrls(frontmatter: any): { [key: string]: string } {
  return getApiUrlsFromFrontmatter(frontmatter);
}

/**
 * Get default API URLs for all services from settings
 */
export function getDefaultApiUrls(settings: ChatGPT_MDSettings): { [key: string]: string } {
  return Object.fromEntries(
    getProviderDefinitions().map((provider) => [provider.id, getProviderUrl(settings, provider)])
  );
}

/**
 * Fetch available models from all services
 */
export async function fetchAvailableModels(
  aiService: IAiApiService,
  urls: { [key: string]: string },
  apiKey: string,
  openrouterApiKey: string,
  apiAuthService: { getApiKey(settings: ChatGPT_MDSettings, serviceType: string): string },
  settingsService: { getSettings(): ChatGPT_MDSettings }
): Promise<string[]> {
  function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
  }

  try {
    const settings = settingsService.getSettings();
    const promises = getProviderDefinitions()
      .map((provider) => {
        const providerApiKey = apiAuthService.getApiKey(settings, provider.id);
        if (provider.requiresApiKey && !isValidApiKey(providerApiKey)) {
          return null;
        }

        return withTimeout(
          aiService.fetchAvailableModels(urls[provider.id], providerApiKey, settings, provider.id),
          FETCH_MODELS_TIMEOUT_MS,
          []
        );
      })
      .filter((promise): promise is Promise<string[]> => promise !== null);

    const results = await Promise.all(promises);
    return results.flat();
  } catch (error) {
    // Handle potential errors during fetch or Promise.all
    new Notice("Error fetching models: " + (error instanceof Error ? error.message : String(error)));
    console.error("Error fetching models:", error);
    // Depending on desired behavior, you might return [] or rethrow
    return []; // Return empty array on error to avoid breaking the modal
  }
}
