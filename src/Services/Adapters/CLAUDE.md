# Provider adapter guide

Authoritative contributor rules are in `/AGENTS.md`; provider steps are in `/docs/CREATE_SERVICE.md`.

Adapters contain protocol differences only. Operational metadata and defaults belong in `Services/Providers/ProviderRegistry.ts`.

`ProviderAdapter` currently requires:

- `type` and `displayName`
- `getAuthHeaders()` for model discovery
- defensive `fetchModels()` parsing from `unknown`
- `requiresApiKey()`
- `extractModelName()`
- idempotent `getApiPathSuffix()`

Use `BaseProviderAdapter` for common prefix handling, key checks, safe model-array extraction, local-server error handling, and the standard `/v1` suffix.

Do not add provider maps to commands/utilities, log credentials, or assume external model responses are valid. Add routing, URL, malformed-response, and registry-completeness tests with every provider change.
