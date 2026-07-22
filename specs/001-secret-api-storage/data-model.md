# Data Model: Secure API Key Storage

## Credential Definition

Central metadata describing one supported credential category.

| Field | Type | Rules |
|---|---|---|
| `category` | enum | `openai`, `openrouter`, `anthropic`, `gemini`, `zai`, `web-search` |
| `legacySetting` | `keyof ChatGPT_MDSettings` | Points to the existing plaintext field |
| `secretIdSetting` | `keyof ChatGPT_MDSettings` | Points to the new persisted reference field |
| `ownedSecretId` | string | Stable, unique, lowercase alphanumeric/dashes |
| `label` | string | Non-sensitive UI/diagnostic category label |

Provider categories extend/reuse `ProviderRegistry` metadata. Web search has one adjacent definition because it is not an AI provider.

## Credential Setting

A persisted pair representing a single category.

| Field | Type | Supported environment | Unsupported environment |
|---|---|---|---|
| Legacy value (for example `apiKey`) | string | Empty after successful migration; retained while migration is pending/failed or until confirmed deletion when a valid same-category reference exists | Plaintext API key used as today |
| Reference (for example `apiKeySecretId`) | optional string | ID selected through `SecretComponent` and resolved through `SecretStorage` | Ignored; no secure UI is shown |

### Added reference fields

- `apiKeySecretId`
- `openrouterApiKeySecretId`
- `anthropicApiKeySecretId`
- `geminiApiKeySecretId`
- `zaiApiKeySecretId`
- `webSearchApiKeySecretId`

All default to `""` (or normalize absent persisted values to `""`) and contain IDs only, never secret values.

## Secure Credential

Obsidian-managed vault-local record.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Lowercase alphanumeric with optional dashes; stable per plugin category |
| `secret` | string | Nonblank API key; never logged or copied into a reference field |

Proposed owned IDs:

- `chatgpt-md-openai-api-key`
- `chatgpt-md-openrouter-api-key`
- `chatgpt-md-anthropic-api-key`
- `chatgpt-md-gemini-api-key`
- `chatgpt-md-zai-api-key`
- `chatgpt-md-web-search-api-key`

A user-selected ID need not be plugin-owned; owned IDs are specifically the migration targets. An existing unreferenced owned ID is overwritten from the current plaintext value during migration. Replacing or clearing a plugin reference leaves the formerly referenced secure record in Obsidian storage.

## Migration State

Derived per category; no separate global migration flag is persisted.

| State | Condition | Action |
|---|---|---|
| `empty` | Legacy value blank and reference blank | No action |
| `plaintext` | Legacy value nonblank and reference blank | Attempt migration when capability is supported |
| `securely-referenced` | Reference nonblank and `getSecret(reference)` returns a value | Resolve on demand; do not migrate |
| `missing-reference` | Reference nonblank but no corresponding secret | Treat as unconfigured; do not expose ID |
| `mixed-valid-reference` | Reference and legacy value nonblank; reference resolves to a valid secret | Treat the reference as authoritative; show the explained deletion action and retain plaintext until user confirmation plus successful persistence |
| `mixed-invalid-reference` | Reference and legacy value nonblank; reference does not resolve or is malformed | Keep plaintext usable, migrate it to the stable plugin-owned ID, and replace the invalid reference only after secure storage and settings persistence succeed |
| `migration-failed` | Storage or settings persistence failed while processing plaintext | Restore/retain plaintext, resolve it for authenticated use only when no valid reference exists, and retry on plugin load/settings-tab opening |
| `legacy` | Either secure storage or secure UI capability unavailable | Do not migrate; read/write only the legacy field |

## State transitions

```text
empty --legacy text edit--> plaintext
plaintext --unsupported runtime--> legacy (persist plaintext)
plaintext --setSecret fails--> migration-failed (plaintext retained and usable)
plaintext --setSecret succeeds + saveData fails--> migration-failed (plaintext restored and usable; stable secure ID may exist)
plaintext --setSecret succeeds + saveData succeeds--> securely-referenced
mixed-valid-reference --user confirms deletion + save succeeds--> securely-referenced (reference unchanged)
mixed-valid-reference --user cancels or save fails--> mixed-valid-reference (plaintext retained)
mixed-invalid-reference --migration succeeds--> securely-referenced (stable plugin-owned reference)
mixed-invalid-reference --migration fails--> migration-failed (plaintext retained and usable)
securely-referenced --secure selection replaced--> securely-referenced (new ID; old secure record retained)
securely-referenced --secure selection cleared--> empty (old secure record retained)
securely-referenced --secret deleted externally--> missing-reference
migration-failed --later successful retry--> securely-referenced
```

## Validation and invariants

1. Whitespace-only, null, absent, or non-string legacy values are not migrated.
2. Persisted credential values, reference IDs, runtime capability members, secure lookup results, and secure-control changes enter as `unknown` and are validated before use; malformed/missing values resolve to no credential and are not logged.
3. A valid secure reference is authoritative. A retained plaintext value is resolved only when no valid reference exists and migration remains pending/failed.
4. A resolved secret is never assigned to `ChatGPT_MDSettings`.
5. Automatic migration clears a legacy value only after secure storage is valid and the same successful per-category save persists its reference; a same-category insecure copy with a valid reference is cleared only after explicit confirmation and a successful save.
6. Valid existing references are never interpreted as plaintext or overwritten by automatic migration; missing/invalid references may be replaced only by safely migrating retained plaintext, and an unreferenced owned ID is overwritten from that authoritative plaintext.
7. Migration continues after a category failure and changes no non-credential fields.
8. Frontmatter and agent content remain outside this model and are never migrated.
