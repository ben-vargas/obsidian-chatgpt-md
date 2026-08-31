# Provider Registry

This folder centralizes provider metadata and AI SDK provider factory wiring.

## Files

### `ProviderRegistry.ts`

`PROVIDER_DEFINITIONS` is the main registry for supported providers. Each entry defines:

- `id` - provider ID from `src/Constants.ts` / `AiServiceType`
- `label` - user-facing provider name
- `requiresApiKey` - whether requests need an API key
- `apiKeySetting` - key in `ChatGPT_MDSettings` for the API key, if any
- `urlSetting` - key in `ChatGPT_MDSettings` for the provider base URL
- `defaultUrl` - default base URL from `DefaultConfigs.ts`
- `createAdapter()` - provider adapter factory from `src/Services/Adapters/`
- `createProviderFactory()` - Vercel AI SDK provider factory
- `getFrontmatterFields(settings)` - provider-specific defaults for generated chat frontmatter

Helper functions:

- `getProviderDefinitions()` - readonly list for UI/commands
- `findProviderDefinition()` / `getProviderDefinition()` - provider lookup
- `createProviderAdapters()` - adapter map consumed by `AiProviderService`
- `getProviderApiKey()` - resolve configured API key from settings
- `getProviderUrl()` - resolve configured or default base URL
- `getProviderFrontmatterFields()` - frontmatter defaults for new chats
- `getProviderFactory()` - AI SDK provider factory for `AiProviderService.ensureProvider()`

### `ProviderRegistry.test.ts`

Unit tests for registry behavior. Update tests when adding providers or changing registry semantics.

## Adding or changing provider behavior

Provider behavior is intentionally split:

1. **Constants/types**: add provider ID constants/types in `src/Constants.ts` if needed.
2. **Defaults**: add provider default config in `src/Services/DefaultConfigs.ts`.
3. **Settings model**: add URL/API-key/default fields in `src/Models/Config.ts` and `DEFAULT_SETTINGS`.
4. **Adapter**: create/update `src/Services/Adapters/*Adapter.ts` for provider-specific API differences.
5. **Registry**: add/update one `PROVIDER_DEFINITIONS` entry here.
6. **UI schema**: update `src/Views/settingsSchema.ts` for user-configurable settings.
7. **Commands/frontmatter**: update command/frontmatter helpers if the provider changes URL/model resolution.
8. **Docs/tests**: update docs and `ProviderRegistry.test.ts`.

## Important rules

- Search before changing provider behavior; metadata is still used in multiple places.
- Keep this registry explicit. Do not introduce dynamic plugin loading or string-based service lookup.
- Do not put API-key values in logs, tests, docs, or generated output.
- Local providers (`ollama`, `lmstudio`) should not require API keys.
- OpenAI-compatible providers usually use `createOpenAICompatible`; OpenAI itself uses `createOpenAI`; OpenRouter uses `createOpenRouter`.
- OpenAI `search-preview` routing is handled in `AiProviderService.createLanguageModel()`, not here.

## Validation

After registry changes, run at least:

```bash
npm run build
npm test -- --runInBand src/Services/Providers/ProviderRegistry.test.ts
```
