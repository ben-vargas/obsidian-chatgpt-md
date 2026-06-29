# Phase 3 Implementation Notes

Date: 2026-06-29

## Summary

Started the provider-registry phase. The goal was to reduce provider metadata duplication without changing provider behavior or public APIs.

## Changes made

### `src/Services/Providers/ProviderRegistry.ts`

Added a central provider registry containing current provider metadata:

- provider id
- display label
- API-key requirement
- API-key setting key
- URL setting key
- default URL
- adapter factory

Added helper functions for:

- listing provider definitions,
- looking up a provider definition,
- creating provider adapters,
- resolving provider API keys/URLs from settings.

### `src/Services/AiProviderService.ts`

- Replaced the hard-coded adapter map with `createProviderAdapters()` from the registry.
- Preserved the existing `AiProviderService` facade and provider factory switch.

### `src/Commands/CommandUtilities.ts`

- Replaced the duplicated default API URL map with registry-driven URL resolution.
- Replaced the hand-written model-fetch promise list with a registry-driven loop.
- Preserved existing behavior:
  - local providers are fetched without API keys,
  - API-key providers are skipped when no valid key exists,
  - each fetch uses the same timeout fallback.

### `src/Services/Providers/ProviderRegistry.test.ts`

Added tests ensuring:

- every `AI_SERVICES` entry has exactly one provider definition,
- every provider can create an adapter with the expected type,
- URL resolution uses configured URLs with defaults as fallback.

### `src/__mocks__/obsidian.ts`

- Imported Jest globals explicitly so new ESM tests that transitively load the Obsidian mock work reliably.

## Validation

```bash
npm run build
npm test -- --runInBand
npm run lint
```

Results:

- `npm run build`: pass
- `npm test -- --runInBand`: pass — 5 suites, 120 tests
- `npm run lint`: pass with 21 existing complexity/length warnings

## Follow-ups

- Continue migrating provider duplication into the registry:
  - settings UI provider sections,
  - frontmatter provider fields,
  - provider API-key lookup in `ApiAuthService`,
  - model URL construction in `ModelSelectHandler`.
- Consider moving AI SDK provider factory selection into the registry in a later small step.
