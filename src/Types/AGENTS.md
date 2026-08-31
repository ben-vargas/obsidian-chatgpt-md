# Types

TypeScript type definitions for AI services.

## AiTypes.ts

Core AI service interfaces and types. Signatures live in the file; below is an index of what each type represents and the non-obvious invariants.

- `IAiApiService` - Contract for AI service implementations; currently implemented by `AiProviderService` only. Methods: `callAiAPI` (streaming + non-streaming), `inferTitle`, `fetchAvailableModels`
- `AiProviderInstance` - `(modelId) => LanguageModel`. The OpenAI provider also exposes `.chat(modelId)`; `AiProviderService` uses it for search-preview models that must hit `/v1/chat/completions`
- `ProviderFactoryConfig` - `{ apiKey, baseURL, fetch?, name }`; `name` is required for OpenAI-compatible providers
- `ProviderFactory` - `(config: ProviderFactoryConfig) => AiProviderInstance`
- `AiProvider` - Union of the Vercel AI SDK provider types used by this plugin (OpenAI, OpenAICompatible, Anthropic, Google, OpenRouter)
- `StreamingResponse` - `{ fullString, mode: "streaming", wasAborted? }`
- `OllamaModel` - `{ name }` (Ollama `/api/tags` list entry)

## ProviderAdapter Types

See `src/Services/Adapters/ProviderAdapter.ts` for:

- `ProviderType` - Union of all provider identifiers
- `AiProviderConfig` - Unified configuration interface
- `ProviderModelData` - Model data from API responses
- `ProviderAdapter` - Adapter contract interface

Provider factories and adapter metadata are registered in `src/Services/Providers/ProviderRegistry.ts`.
