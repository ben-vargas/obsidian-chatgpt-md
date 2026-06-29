# Adding an AI Provider

> Historical note: this file used to describe a service-per-provider architecture. The current architecture uses one AI facade plus provider adapters.

## Current provider architecture

```text
ChatHandler / InferTitleHandler / ModelSelectHandler
        │
        ▼
AiProviderService
        │
        ├── ProviderAdapter implementations in src/Services/Adapters/
        ├── AI SDK provider factories
        ├── ApiAuthService for API keys
        └── ApiService for fetch/request helpers
```

`AiProviderService` is the public facade used by commands. Provider-specific behavior should live in an adapter implementing `ProviderAdapter`.

## Provider adapter contract

The adapter interface lives in `src/Services/Adapters/ProviderAdapter.ts`.

A provider adapter defines:

- `type` — provider ID from `AiServiceType`.
- `displayName` — human-readable provider label.
- `getDefaultBaseUrl()` — default API base URL.
- `getAuthHeaders(apiKey)` — headers for model-list/API helper requests.
- `fetchModels(...)` — model list retrieval and parsing.
- `getSystemMessageRole()` — usually `system`, OpenAI may use `developer`.
- `supportsSystemField()` — whether the provider has a separate system field.
- `supportsToolCalling()` — whether tools are supported.
- `requiresApiKey()` — false for local providers like Ollama/LM Studio.
- `extractModelName(modelId)` — remove provider prefix.
- `getApiPathSuffix(url?)` — API path suffix for AI SDK base URL.

Most adapters can extend `BaseProviderAdapter`.

## Step-by-step provider addition

Until a central provider registry exists, adding a provider requires coordinated edits.

### 1. Add constants/types

Update `src/Constants.ts` with the provider ID if needed.

Provider model IDs should use the prefix format:

```text
provider@model-name
```

Example:

```text
openai@gpt-4.1-mini
anthropic@claude-sonnet-4-20250514
```

### 2. Add default config

Update `src/Services/DefaultConfigs.ts`.

Keep defaults small and provider-specific. Include at least:

- `aiService`
- `model`
- `url`
- `stream`
- `temperature`
- token limits if supported

### 3. Add settings fields

Update `src/Models/Config.ts`:

- add API key field if required,
- add URL field,
- add provider default model/temperature/token fields,
- update `ChatGPT_MDSettings`,
- update `DEFAULT_SETTINGS`.

Preserve backward compatibility for existing settings.

### 4. Implement an adapter

Create `src/Services/Adapters/YourProviderAdapter.ts`.

Minimal shape:

```ts
import { ChatGPT_MDSettings } from "src/Models/Config";
import { BaseProviderAdapter } from "./BaseProviderAdapter";
import { ProviderType } from "./ProviderAdapter";

export class YourProviderAdapter extends BaseProviderAdapter {
  readonly type: ProviderType = "yourprovider";
  readonly displayName = "Your Provider";

  getDefaultBaseUrl(): string {
    return "https://api.example.com";
  }

  getAuthHeaders(apiKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async fetchModels(
    url: string,
    apiKey: string | undefined,
    settings: ChatGPT_MDSettings | undefined,
    makeGetRequest: (url: string, headers: Record<string, string>, provider: string) => Promise<unknown>
  ): Promise<string[]> {
    if (!this.validateApiKey(apiKey)) return [];

    const data = await makeGetRequest(`${url}/v1/models`, this.getAuthHeaders(apiKey || ""), this.type);
    // Parse provider response and return prefixed model IDs.
    return [];
  }
}
```

Use `unknown` for raw external JSON and narrow before reading fields.

### 5. Register adapter and AI SDK factory

Update `src/Services/AiProviderService.ts`:

- import the adapter,
- add it to the adapter map,
- add the AI SDK provider factory in `getProviderFactory()` if needed.

Prefer an OpenAI-compatible provider when the API supports it.

### 6. Add auth lookup

Update `src/Services/ApiAuthService.ts` if the provider needs a new API key setting.

### 7. Update URL/frontmatter helpers

Search for existing providers and update equivalent places:

```bash
rg "openai|anthropic|gemini|openrouter|ollama|lmstudio|zai" src/Commands src/Utilities src/Services src/Views src/Models
```

Common files:

- `src/Commands/CommandUtilities.ts`
- `src/Utilities/FrontmatterHelpers.ts`
- `src/Utilities/ProviderHelpers.ts`
- `src/Services/SettingsService.ts`

### 8. Update settings UI

Update provider settings in `src/Views/ChatGPT_MDSettingsTab.ts`.

This area is scheduled for refactor into a data-driven schema. Keep changes minimal and consistent with existing provider sections.

### 9. Add tests where practical

Good test targets:

- adapter model parsing,
- URL resolution,
- provider detection from model prefix,
- settings/frontmatter merge behavior.

## Checklist

- [ ] Provider constant/type added.
- [ ] Defaults added.
- [ ] Settings interface/defaults updated.
- [ ] Adapter implemented.
- [ ] Adapter registered in `AiProviderService`.
- [ ] API key lookup updated if needed.
- [ ] URL/frontmatter/provider helper paths updated.
- [ ] Settings UI updated.
- [ ] Docs updated.
- [ ] `npm run build` passes.
- [ ] `npm test -- --runInBand` passes.
- [ ] `npm run lint` passes or only existing warnings remain.

## Future direction

The maintainability plan recommends a central provider registry so provider metadata is defined once and reused by defaults, settings UI, URL resolution, frontmatter generation, model fetching, and adapter registration.

Until then, use the checklist above and search carefully before changing provider behavior.
