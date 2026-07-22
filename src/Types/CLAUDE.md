# Types

TypeScript type definitions for AI services.

## AiTypes.ts

**Core AI service interfaces and types**

### IAiApiService

Contract for AI service implementations (currently implemented by `AiProviderService`):

```typescript
interface IAiApiService {
  callAiAPI(
    messages: Message[],
    options: Record<string, unknown>,
    headingPrefix: string,
    url: string,
    editor?: Editor,
    setAtCursor?: boolean,
    apiKey?: string,
    settings?: ChatGPT_MDSettings,
    toolService?: ToolService
  ): Promise<{ fullString: string; mode: string; wasAborted?: boolean }>;

  inferTitle(
    view: MarkdownView,
    settings: ChatGPT_MDSettings,
    messages: string[],
    editorService: EditorService
  ): Promise<string>;

  fetchAvailableModels(
    url: string,
    apiKey?: string,
    settings?: ChatGPT_MDSettings,
    providerType?: string
  ): Promise<string[]>;
}
```

### AiProviderInstance

Function type that creates language models from model IDs:

```typescript
interface AiProviderInstance {
  (modelId: string): LanguageModel;
}
```

### ProviderFactoryConfig

Configuration for creating AI SDK providers:

```typescript
interface ProviderFactoryConfig {
  apiKey: string;
  baseURL: string;
  fetch?: typeof fetch;
  name: string; // Required for OpenAICompatible providers
}
```

### ProviderFactory

Factory function type for creating providers:

```typescript
type ProviderFactory = (config: ProviderFactoryConfig | unknown) => AiProviderInstance;
```

### AiProvider

Union type of all Vercel AI SDK provider types:

```typescript
type AiProvider =
  | OpenAIProvider
  | OpenAICompatibleProvider
  | AnthropicProvider
  | GoogleProvider
  | OpenRouterProvider;
```

### StreamingResponse

Response type for streaming API calls:

```typescript
type StreamingResponse = {
  fullString: string;
  mode: "streaming";
  wasAborted?: boolean;
};
```

### OllamaModel

Model interface for Ollama API responses:

```typescript
interface OllamaModel {
  name: string;
}
```

## ProviderAdapter Types

See `src/Services/Adapters/ProviderAdapter.ts` for:

- `ProviderType` - Union of all provider identifiers
- `AiProviderConfig` - Unified configuration interface
- `ProviderModelData` - Model data from API responses
- `ProviderAdapter` - Adapter contract interface
