# Phase 0 Research: Secure API Key Storage

## Decision 1: Detect secure credential capability at runtime

- **Decision**: Treat secure mode as supported only when `app.secretStorage` exposes callable `setSecret`, `getSecret`, and `listSecrets` and the Obsidian module exposes a constructible `SecretComponent`. If either side is absent, use full legacy storage, resolution, and UI behavior and do not migrate. Encapsulate the combined check behind the credential service/UI boundary rather than reading a version number.
- **Rationale**: The installed typings mark `App.secretStorage` and `SecretStorage` as available since Obsidian 1.11.4 and `SecretComponent` as available since 1.11.1/1.11.4, while the plugin manifest still supports Obsidian 0.15.0. Runtime feature detection therefore preserves desktop/mobile and old-version compatibility without raising `minAppVersion`.
- **Alternatives considered**: Comparing `app.version` (rejected because capability, not declared version, is the requirement); raising `minAppVersion` (rejected because legacy support is required); checking storage only and always constructing `SecretComponent` (rejected because UI capability can be absent independently in test or compatibility environments).

## Decision 2: Keep plaintext and secret references in distinct persisted fields

- **Decision**: Retain the six legacy value fields (`apiKey`, `openrouterApiKey`, `anthropicApiKey`, `geminiApiKey`, `zaiApiKey`, `webSearchApiKey`) for unsupported environments and add six optional reference fields with a `SecretId` suffix. On supported environments, successful migration writes the stable reference field and clears the corresponding legacy field.
- **Rationale**: Separate fields make migration state explicit, prevent a credential ID from being mistaken for plaintext, allow a failed migration to retain the original key, and ensure a downgrade sees an empty legacy key instead of sending a reference string as a credential. They also permit mixed and partial migration without heuristics.
- **Alternatives considered**: Reusing each existing key field for either plaintext or a reference (rejected as ambiguous and unsafe on downgrade); storing a global migration flag (rejected because partial failures require per-credential state); encrypted values in `data.json` (rejected because Obsidian owns the requested facility).

## Decision 3: Use stable plugin-owned secret IDs

- **Decision**: Assign deterministic lowercase/dash IDs scoped by plugin and category, such as `chatgpt-md-openai-api-key` and `chatgpt-md-web-search-api-key`, from centralized credential metadata. Migration calls `setSecret` with the same ID on every retry. If that owned ID exists without a persisted reference, the current plaintext setting remains authoritative and overwrites the owned secret before the reference is persisted.
- **Rationale**: `SecretStorage.setSecret` accepts lowercase alphanumeric IDs with optional dashes and is synchronous. Stable IDs make retries idempotent: an interrupted retry updates the same record instead of creating duplicates. Distinct category IDs prevent provider collisions.
- **Alternatives considered**: Random IDs (rejected because retries duplicate credentials); secret-content hashes (rejected because derived sensitive data should not be persisted or logged); user-visible provider labels as IDs (rejected because labels can change and may violate the ID grammar).

## Decision 4: Centralize storage, resolution, and migration ownership

- **Decision**: Expand `ApiAuthService` (or rename/extract a narrowly scoped credential service during implementation) to own capability checks, reference resolution, stable IDs, and transactional per-field migration. Wire it explicitly in `ServiceContainer`; let `SettingsService` coordinate load/save and let views only render the appropriate control.
- **Rationale**: Authentication already converges on `ApiAuthService`, and the constitution requires one credential ownership boundary with explicit constructor injection. Provider credential metadata remains in `ProviderRegistry`; web-search metadata can be appended as the one non-provider credential definition.
- **Alternatives considered**: Resolution in each command/provider/tool (rejected as duplicated and incomplete); migration in the settings view (rejected because startup migration must not depend on opening settings); a generic DI/plugin framework (rejected as unnecessary).

## Decision 5: Make migration safe around asynchronous settings persistence

- **Decision**: Migrate credentials sequentially and independently on every plugin load and whenever the settings tab opens while eligible plaintext remains. For each nonblank legacy value lacking a valid reference: write/overwrite the stable owned secret from current plaintext; stage `{secretId, legacyValue: ""}`; call `saveData`; only keep the staged in-memory change after save succeeds. If secure storage or save fails, restore that field pair in memory, retain plaintext as a narrowly scoped authenticated fallback when no valid reference resolves, report only the category, continue with other categories, and retry later. When one category contains both plaintext and a valid reference, preserve the authoritative reference and plaintext until the user confirms the explained “Delete insecure copy” action and its save succeeds; when the reference is invalid, safely replace it by migrating the retained plaintext.
- **Rationale**: `setSecret` is synchronous but plugin settings persistence is asynchronous. Per-field saves are the smallest transaction boundary that guarantees plaintext is not removed before its reference is durable. A failed save can leave a harmless secure entry, but stable IDs ensure retry overwrites rather than duplicates it.
- **Alternatives considered**: One final save after migrating all keys (rejected because one failure obscures per-key durability and retry state); clearing plaintext before `setSecret` (rejected due to data loss); deleting a secure entry after save failure (not supported by the exposed `SecretStorage` API and unnecessary with stable IDs).

## Decision 6: Resolve secrets only at authenticated operation boundaries

- **Decision**: Keep request/provider APIs accepting resolved secret strings, but obtain those strings through the credential service immediately before chat, title inference, model discovery, agent creation, and web search. In supported mode, resolve a valid reference first and use retained plaintext only for a pending/failed migration with no valid reference. Update web-search availability and execution to use credential resolution instead of directly reading `webSearchApiKey`, without changing approval-before-execution or selected-results-only sharing.
- **Rationale**: `SecretStorage.getSecret` is synchronous, so existing call signatures need minimal change. This avoids propagating references into provider SDKs and closes the current direct web-search settings path.
- **Alternatives considered**: Resolve all credentials into the settings object at startup (rejected because plaintext would remain broadly resident and could be persisted accidentally); change all provider APIs to reference objects (rejected as a broad rewrite).

## Decision 7: Render `SecretComponent` only when fully supported

- **Decision**: Add a credential kind to settings schema. In fully supported environments, render an Obsidian `SecretComponent` initialized with the persisted secret ID and persist only its selected ID on change. In partial/unsupported environments, render the existing text control against the legacy value and do not migrate. Clearing or replacing a selection changes only the plugin reference and leaves the old secure credential in Obsidian storage. When a valid reference and plaintext coexist, show an explanation and “Delete insecure copy” button only for that category; clear plaintext only after explicit confirmation and successful persistence.
- **Rationale**: This uses Obsidian's native selection/creation flow while preserving the exact legacy input behavior. UI capability remains a view concern; persistence and resolution remain service concerns.
- **Alternatives considered**: A custom password input (rejected because it bypasses Obsidian credential management); showing both controls (rejected because users could reintroduce plaintext on supported versions).

## Decision 8: Test with a capability-shaped fake, no new dependency

- **Decision**: Extend the Obsidian Jest mock with optional in-memory `SecretStorage`/`SecretComponent` behavior and inject capability-shaped fakes into credential and settings tests. Treat persisted fields, capability members, lookup results, and UI change values as `unknown` and validate them. Cover all six categories, blank values, full versus partial capability, load/settings-open retries, cross-category mixed state, same-category confirmed deletion, invalid references, existing owned-ID overwrite, storage failure with continued authentication, save failure rollback, repeated migration, missing references, old-secure-record retention, web-search approval/result selection, and redacted diagnostics.
- **Rationale**: Pure deterministic tests are practical because the Obsidian methods are synchronous and settings persistence is already mocked. No additional package is needed.
- **Alternatives considered**: Integration-only Obsidian testing (rejected as insufficient regression coverage); adding a credential mocking package (rejected as unnecessary).
