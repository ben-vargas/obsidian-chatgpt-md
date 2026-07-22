import { LanguageModel } from "ai";

/** An AI SDK provider instance that creates language models by ID. */
export interface AiProviderInstance {
  (modelId: string): LanguageModel;
}

/** Shared subset accepted by the installed provider factories. */
export interface ProviderFactoryConfig {
  apiKey: string;
  baseURL: string;
  fetch?: typeof fetch;
  name: string;
}

/** Loose by design because provider packages expose slightly different factory signatures. */
export type ProviderFactory = (config: ProviderFactoryConfig) => AiProviderInstance;
