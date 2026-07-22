# Adding an AI provider

ChatGPT MD uses one request facade, an operational provider registry, and provider-specific adapters:

```text
Commands → AiProviderService → ProviderRuntime
                              ├─ ProviderRegistry
                              └─ ProviderAdapter
```

Do not create a service class per provider.

## 1. Add the provider ID

Add the ID to `src/Constants.ts` and `AI_SERVICES`. Model IDs use `provider@model-name`; unprefixed IDs remain OpenAI-compatible for backward compatibility.

## 2. Add persisted defaults

Update:

- `src/Services/DefaultConfigs.ts`
- `src/Models/Config.ts` settings interfaces and `DEFAULT_SETTINGS`

Preserve existing setting names. Add a migration only when existing persisted values must be transformed.

## 3. Implement the adapter

Create `src/Services/Adapters/YourProviderAdapter.ts`, normally extending `BaseProviderAdapter`.

The adapter owns protocol differences:

- provider `type` and `displayName`;
- authentication headers used for model discovery;
- model-list retrieval and defensive response parsing;
- API key requirement;
- model-prefix removal;
- idempotent AI SDK endpoint suffixing;
- exceptional tool-support behavior, if any.

External JSON enters as `unknown` and must be checked before fields are read. Endpoint suffixes must return an empty string when the configured URL already contains the required path.

## 4. Register operational metadata

Add one entry to `src/Services/Providers/ProviderRegistry.ts` containing:

- ID, label, and local/cloud status;
- API key and URL setting keys;
- default URL/config;
- adapter factory;
- AI SDK provider factory;
- default frontmatter fields.

Do not add parallel provider maps to commands or utilities. Registry completeness tests must continue to cover every ID in `AI_SERVICES`.

## 5. Add settings UI fields

Add provider-specific fields and descriptions to `src/Views/settingsSchema.ts`. Operational metadata belongs in the registry; user-facing prose belongs in the UI schema.

Numeric settings need a documented range in `ChatGPT_MDSettingsTab` parsing. Never save `NaN`.

## 6. Add tests

At minimum cover:

- registry completeness and adapter creation;
- provider selection from the model prefix;
- default/custom/already-suffixed base URLs;
- model extraction and model-list parsing, including malformed responses;
- missing credentials versus local discovery;
- stream/non-stream generation-option mapping;
- title inference routing;
- tool declaration behavior if supported.

Unit tests must mock network/provider SDK boundaries and must not use real API keys.

## 7. Update docs

Update README provider examples, settings documentation, privacy implications, and release notes. Search for existing provider IDs before submitting:

```bash
rg "openai|anthropic|gemini|openrouter|ollama|lmstudio|zai" src docs README.md
```

## Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
```
