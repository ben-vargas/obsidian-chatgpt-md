import { ChatGPT_MDSettings } from "src/Models/Config";
import {
  AI_SERVICE_ANTHROPIC,
  AI_SERVICE_GEMINI,
  AI_SERVICE_LMSTUDIO,
  AI_SERVICE_OLLAMA,
  AI_SERVICE_OPENAI,
  AI_SERVICE_OPENROUTER,
  AI_SERVICE_ZAI,
  AiServiceType,
} from "src/Constants";
import {
  DEFAULT_ANTHROPIC_CONFIG,
  DEFAULT_GEMINI_CONFIG,
  DEFAULT_LMSTUDIO_CONFIG,
  DEFAULT_OLLAMA_CONFIG,
  DEFAULT_OPENAI_CONFIG,
  DEFAULT_OPENROUTER_CONFIG,
  DEFAULT_ZAI_CONFIG,
} from "src/Services/DefaultConfigs";
import { ProviderAdapter } from "src/Services/Adapters/ProviderAdapter";
import { OpenAIAdapter } from "src/Services/Adapters/OpenAIAdapter";
import { AnthropicAdapter } from "src/Services/Adapters/AnthropicAdapter";
import { GeminiAdapter } from "src/Services/Adapters/GeminiAdapter";
import { LmStudioAdapter } from "src/Services/Adapters/LmStudioAdapter";
import { OllamaAdapter } from "src/Services/Adapters/OllamaAdapter";
import { OpenRouterAdapter } from "src/Services/Adapters/OpenRouterAdapter";
import { ZaiAdapter } from "src/Services/Adapters/ZaiAdapter";

export type ApiKeySettingKey = "apiKey" | "openrouterApiKey" | "anthropicApiKey" | "geminiApiKey" | "zaiApiKey";

export type UrlSettingKey =
  "openaiUrl" | "openrouterUrl" | "ollamaUrl" | "lmstudioUrl" | "anthropicUrl" | "geminiUrl" | "zaiUrl";

export interface ProviderDefinition {
  id: AiServiceType;
  label: string;
  requiresApiKey: boolean;
  apiKeySetting?: ApiKeySettingKey;
  urlSetting: UrlSettingKey;
  defaultUrl: string;
  createAdapter: () => ProviderAdapter;
  getFrontmatterFields: (settings: ChatGPT_MDSettings) => Record<string, unknown>;
}

export const PROVIDER_DEFINITIONS: readonly ProviderDefinition[] = [
  {
    id: AI_SERVICE_OLLAMA,
    label: "Ollama",
    requiresApiKey: false,
    urlSetting: "ollamaUrl",
    defaultUrl: DEFAULT_OLLAMA_CONFIG.url,
    createAdapter: () => new OllamaAdapter(),
    getFrontmatterFields: (settings) => ({
      url: settings.ollamaUrl,
      temperature: settings.ollamaDefaultTemperature,
      top_p: settings.ollamaDefaultTopP,
    }),
  },
  {
    id: AI_SERVICE_OPENAI,
    label: "OpenAI",
    requiresApiKey: true,
    apiKeySetting: "apiKey",
    urlSetting: "openaiUrl",
    defaultUrl: DEFAULT_OPENAI_CONFIG.url,
    createAdapter: () => new OpenAIAdapter(),
    getFrontmatterFields: (settings) => ({
      model: settings.openaiDefaultModel,
      temperature: settings.openaiDefaultTemperature,
      top_p: settings.openaiDefaultTopP,
      max_tokens: settings.openaiDefaultMaxTokens,
      presence_penalty: settings.openaiDefaultPresencePenalty,
      frequency_penalty: settings.openaiDefaultFrequencyPenalty,
    }),
  },
  {
    id: AI_SERVICE_OPENROUTER,
    label: "OpenRouter",
    requiresApiKey: true,
    apiKeySetting: "openrouterApiKey",
    urlSetting: "openrouterUrl",
    defaultUrl: DEFAULT_OPENROUTER_CONFIG.url,
    createAdapter: () => new OpenRouterAdapter(),
    getFrontmatterFields: (settings) => ({
      model: settings.openrouterDefaultModel,
      temperature: settings.openrouterDefaultTemperature,
      top_p: settings.openrouterDefaultTopP,
      max_tokens: settings.openrouterDefaultMaxTokens,
      presence_penalty: settings.openrouterDefaultPresencePenalty,
      frequency_penalty: settings.openrouterDefaultFrequencyPenalty,
    }),
  },
  {
    id: AI_SERVICE_LMSTUDIO,
    label: "LM Studio",
    requiresApiKey: false,
    urlSetting: "lmstudioUrl",
    defaultUrl: DEFAULT_LMSTUDIO_CONFIG.url,
    createAdapter: () => new LmStudioAdapter(),
    getFrontmatterFields: (settings) => ({
      url: settings.lmstudioUrl,
      temperature: settings.lmstudioDefaultTemperature,
      top_p: settings.lmstudioDefaultTopP,
      presence_penalty: settings.lmstudioDefaultPresencePenalty,
      frequency_penalty: settings.lmstudioDefaultFrequencyPenalty,
    }),
  },
  {
    id: AI_SERVICE_ANTHROPIC,
    label: "Anthropic",
    requiresApiKey: true,
    apiKeySetting: "anthropicApiKey",
    urlSetting: "anthropicUrl",
    defaultUrl: DEFAULT_ANTHROPIC_CONFIG.url,
    createAdapter: () => new AnthropicAdapter(),
    getFrontmatterFields: (settings) => ({
      model: settings.anthropicDefaultModel,
      url: settings.anthropicUrl,
      temperature: settings.anthropicDefaultTemperature,
      max_tokens: settings.anthropicDefaultMaxTokens,
    }),
  },
  {
    id: AI_SERVICE_GEMINI,
    label: "Gemini",
    requiresApiKey: true,
    apiKeySetting: "geminiApiKey",
    urlSetting: "geminiUrl",
    defaultUrl: DEFAULT_GEMINI_CONFIG.url,
    createAdapter: () => new GeminiAdapter(),
    getFrontmatterFields: (settings) => ({
      model: settings.geminiDefaultModel,
      url: settings.geminiUrl,
      temperature: settings.geminiDefaultTemperature,
      top_p: settings.geminiDefaultTopP,
      max_tokens: settings.geminiDefaultMaxTokens,
    }),
  },
  {
    id: AI_SERVICE_ZAI,
    label: "Z.AI",
    requiresApiKey: true,
    apiKeySetting: "zaiApiKey",
    urlSetting: "zaiUrl",
    defaultUrl: DEFAULT_ZAI_CONFIG.url,
    createAdapter: () => new ZaiAdapter(),
    getFrontmatterFields: (settings) => ({
      model: settings.zaiDefaultModel,
      url: settings.zaiUrl,
      temperature: settings.zaiDefaultTemperature,
      max_tokens: settings.zaiDefaultMaxTokens,
    }),
  },
] as const;

export function getProviderDefinitions(): readonly ProviderDefinition[] {
  return PROVIDER_DEFINITIONS;
}

export function findProviderDefinition(providerId: string): ProviderDefinition | undefined {
  return PROVIDER_DEFINITIONS.find((provider) => provider.id === providerId);
}

export function getProviderDefinition(providerId: AiServiceType): ProviderDefinition {
  const definition = findProviderDefinition(providerId);
  if (!definition) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }
  return definition;
}

export function createProviderAdapters(): Map<AiServiceType, ProviderAdapter> {
  return new Map(PROVIDER_DEFINITIONS.map((provider) => [provider.id, provider.createAdapter()]));
}

export function getProviderApiKey(settings: ChatGPT_MDSettings, provider: ProviderDefinition): string | undefined {
  return provider.apiKeySetting ? settings[provider.apiKeySetting] : undefined;
}

export function getProviderUrl(settings: ChatGPT_MDSettings, provider: ProviderDefinition): string {
  return settings[provider.urlSetting] || provider.defaultUrl;
}

export function getProviderFrontmatterFields(
  providerId: string,
  settings: ChatGPT_MDSettings
): Record<string, unknown> {
  return findProviderDefinition(providerId)?.getFrontmatterFields(settings) || {};
}
