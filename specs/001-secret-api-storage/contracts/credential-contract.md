# Credential Interface Contract

## Runtime capability contract

`CredentialService.isSecureStorageSupported()` returns true only when the runtime exposes usable `setSecret`, `getSecret`, and `listSecrets` and a constructible `SecretComponent`. If either storage or UI capability is absent, every caller uses full legacy behavior and migration is skipped. No caller infers support from an Obsidian version string.

## Persistence contract

For each credential category:

- **Supported mode**: plugin `data.json` may contain a secret ID in `*SecretId`; it must not contain the secret in the corresponding legacy key after successful per-category migration. Plaintext may remain temporarily only while migration/cleanup is pending or failed.
- **Legacy mode**: the existing key field remains the source of truth and the `*SecretId` field is ignored.
- A reference is opaque to plugin consumers and must never be sent as an API credential.
- Non-credential settings and configuration precedence are unchanged.

## Resolution contract

```ts
resolveProviderCredential(settings, providerId): string
resolveWebSearchCredential(settings): string
```

- Supported mode validates the relevant reference and lookup result from `unknown`, then returns a valid resolved secret.
- If supported-mode migration is pending/failed and no valid reference resolves, resolution validates and returns the retained nonblank legacy value so the credential remains usable until retry succeeds.
- A valid reference is authoritative over any same-category legacy value.
- Unsupported mode validates and returns the existing plaintext value or `""`; reference fields are ignored.
- Missing/deleted references with no retained migration value return `""`, producing existing missing-key behavior.
- Methods do not log IDs or values.

## Migration contract

```ts
migrateLegacyCredentials(
  settings: ChatGPT_MDSettings,
  persist: () => Promise<void>
): Promise<CredentialMigrationSummary>
```

- Processes all six categories independently.
- Skips unsupported runtime and blank legacy values.
- Across categories, migrates plaintext categories while preserving already-secured categories.
- Runs on each plugin load and settings-tab opening while eligible plaintext remains.
- For a same-category valid reference plus plaintext, preserves both values until the user confirms the explained deletion action and that cleanup save succeeds.
- For a same-category missing/invalid reference plus plaintext, safely replaces the unusable reference with the stable plugin-owned reference only after storage and persistence succeed.
- Uses deterministic plugin-owned IDs; if an owned ID exists without the setting referencing it, overwrites it from current authoritative plaintext before persisting the reference.
- Retains/restores usable plaintext unless secure storage/reference validation and settings persistence succeed.
- Continues after failure; summary contains category/status only, never values or IDs.
- Repeated runs converge without duplicate IDs.

## Settings UI contract

- Credential schema entries render `SecretComponent` in supported mode and the existing text input otherwise.
- Persisted values and `SecretComponent` changes enter the boundary as `unknown`; only valid reference IDs or the explicit empty clearing value are accepted.
- `SecretComponent.setValue` receives the validated persisted reference ID.
- `onChange(id)` persists the validated ID field only; replacing or clearing changes only the plugin reference and leaves the old secure record in Obsidian storage.
- When a valid reference and plaintext coexist, the UI shows an explanation and “Delete insecure copy” button only for that category; confirmation clears plaintext only after persistence succeeds, while cancellation/failure retains it.
- Legacy text changes persist only the legacy field.
- Supported UI never displays, receives, or saves the secret value through plugin settings code.

## Authenticated workflow contract

The following consume a resolved value, never a reference: chat requests, streaming/non-streaming calls, title inference, model listing/selection, agent model checks/creation, Brave search, and custom web search bearer authentication. Web search still requires explicit approval before execution; rejected calls do not execute, and only explicitly selected results may enter model context.

## Failure and privacy contract

- Storage/persistence failures may identify the credential category and suggest retrying, but must not include the legacy value, resolved secret, or secret ID.
- Missing referenced secrets use existing missing-key notices/errors.
- Logger redaction remains defense in depth; callers must not intentionally pass credential values into logs.
