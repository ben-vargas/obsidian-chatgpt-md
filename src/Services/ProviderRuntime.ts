import { LanguageModel } from "ai";
import { AiProviderConfig, ProviderAdapter, ProviderType } from "./Adapters/ProviderAdapter";
import { ApiService } from "./ApiService";
import { createProviderAdapters, getProviderDefinition, getProviderFactory } from "./Providers/ProviderRegistry";
import { AiProviderInstance } from "src/Types/ProviderTypes";
import { Logger } from "src/Utilities/Logger";

/** Owns provider selection and the AI SDK provider cache for one request facade. */
export class ProviderRuntime {
  private readonly adapters = createProviderAdapters();
  private adapter: ProviderAdapter = this.adapters.get("openai")!;
  private provider?: AiProviderInstance;
  private providerCacheKey?: string;

  constructor(private readonly apiService: ApiService) {}

  get currentAdapter(): ProviderAdapter {
    return this.adapter;
  }

  selectFromModel(model: string): void {
    const selected = [...this.adapters.entries()].find(([type]) => model.startsWith(`${type}@`));
    this.setAdapter(selected?.[0] || "openai");
  }

  selectProvider(type: ProviderType): boolean {
    if (!this.adapters.has(type)) return false;
    this.setAdapter(type);
    return true;
  }

  getDefaultConfig(): AiProviderConfig {
    return {
      provider: this.adapter.type,
      model: "",
      maxTokens: 400,
      temperature: 0.7,
      stream: true,
      url: getProviderDefinition(this.adapter.type).defaultUrl,
      title: "Untitled",
      system_commands: null,
      tags: null,
    };
  }

  createLanguageModel(apiKey: string | undefined, config: AiProviderConfig): LanguageModel {
    if (!config.model) throw new Error("No model specified. Please select a model or set it in frontmatter.");
    this.ensureProvider(apiKey, config.url);

    const modelName = this.adapter.extractModelName(config.model);
    if (!modelName) throw new Error(`Invalid model name: ${config.model}`);

    const provider = this.provider!;
    if (this.adapter.type === "openai" && modelName.includes("search-preview")) {
      const chat = (provider as AiProviderInstance & { chat?: (id: string) => LanguageModel }).chat;
      if (chat) return chat(modelName);
    }
    return provider(modelName);
  }

  private setAdapter(type: ProviderType): void {
    const next = this.adapters.get(type);
    if (!next || next === this.adapter) return;
    this.adapter = next;
    this.provider = undefined;
    this.providerCacheKey = undefined;
  }

  private ensureProvider(apiKey: string | undefined, url: string): void {
    const normalizedUrl = url.replace(/\/+$/, "");
    const cacheKey = `${this.adapter.type}|${normalizedUrl}|${apiKey ?? ""}`;
    if (this.provider && this.providerCacheKey === cacheKey) return;

    const suffix = this.adapter.getApiPathSuffix(normalizedUrl);
    const baseURL = `${normalizedUrl}${suffix}`;
    Logger.debug(`[ChatGPT MD] Creating provider ${this.adapter.type}`, { baseURL, hasApiKey: Boolean(apiKey) });

    this.provider = getProviderFactory(
      this.adapter.type,
      normalizedUrl
    )({
      apiKey: apiKey || "",
      baseURL,
      fetch: this.apiService.createFetchAdapter(),
      name: this.adapter.type,
    });
    this.providerCacheKey = cacheKey;
  }
}
