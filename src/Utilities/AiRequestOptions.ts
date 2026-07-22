import { AiProviderConfig } from "src/Services/Adapters/ProviderAdapter";

export interface LegacyAiRequestOptions extends Partial<AiProviderConfig> {
  max_tokens?: unknown;
  top_p?: unknown;
  presence_penalty?: unknown;
  frequency_penalty?: unknown;
}

export interface GenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Normalize persisted snake_case frontmatter and the internal camelCase config
 * into the option names expected by AI SDK 7.
 */
export function getGenerationOptions(config: LegacyAiRequestOptions): GenerationOptions {
  return {
    temperature: finiteNumber(config.temperature),
    maxOutputTokens: finiteNumber(config.max_tokens) ?? finiteNumber(config.maxTokens),
    topP: finiteNumber(config.top_p) ?? finiteNumber(config.topP),
    presencePenalty: finiteNumber(config.presence_penalty) ?? finiteNumber(config.presencePenalty),
    frequencyPenalty: finiteNumber(config.frequency_penalty) ?? finiteNumber(config.frequencyPenalty),
  };
}
