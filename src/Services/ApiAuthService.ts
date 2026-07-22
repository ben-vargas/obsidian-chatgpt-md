import { ChatGPT_MDSettings } from "src/Models/Config";
import { findProviderDefinition, getProviderApiKey } from "./Providers/ProviderRegistry";

export function isValidApiKey(apiKey?: string): boolean {
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

/** Resolves provider credentials from persisted settings without logging them. */
export class ApiAuthService {
  getApiKey(settings: ChatGPT_MDSettings, serviceType: string): string {
    const provider = findProviderDefinition(serviceType);
    return provider ? getProviderApiKey(settings, provider) || "" : "";
  }
}
