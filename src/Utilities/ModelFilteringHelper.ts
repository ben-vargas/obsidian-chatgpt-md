/**
 * Centralized model filtering and validation utilities
 * Eliminates duplication between ToolSupportDetector and FrontmatterHelpers
 */

import { AiServiceType } from "src/Constants";

interface ModelInfo {
  fullId: string; // "openai@gpt-4"
  provider: AiServiceType; // "openai"
  modelId: string; // "gpt-4"
}

/**
 * Parse model ID into provider and model components
 *
 * @param fullId - Model ID with optional provider prefix
 * @returns Parsed model information
 *
 * @example
 * parseModelId("openai@gpt-4") // { fullId: "openai@gpt-4", provider: "openai", modelId: "gpt-4" }
 * parseModelId("gpt-4")        // { fullId: "openai@gpt-4", provider: "openai", modelId: "gpt-4" }
 */
function parseModelId(fullId: string): ModelInfo {
  const parts = fullId.split("@");

  if (parts.length === 2) {
    return {
      fullId,
      provider: parts[0] as AiServiceType,
      modelId: parts[1],
    };
  }

  // Default to OpenAI if no prefix
  return {
    fullId: `openai@${fullId}`,
    provider: "openai",
    modelId: fullId,
  };
}

/**
 * Get just the model name without provider prefix
 *
 * @param fullId - Full model ID
 * @returns Model name only
 *
 * @example
 * getModelName("openai@gpt-4")                // "gpt-4"
 * getModelName("openrouter@openai/gpt-5.2")   // "gpt-5.2"
 * getModelName("gpt-4")                       // "gpt-4"
 */
export function getModelName(fullId: string): string {
  let modelId = parseModelId(fullId).modelId;

  // Handle OpenRouter format "provider/model"
  if (modelId.includes("/")) {
    modelId = modelId.split("/")[1];
  }

  return modelId;
}
