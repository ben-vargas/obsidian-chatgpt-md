# Feature Specification: Secure API Key Storage

**Feature Branch**: `001-secret-api-storage`
**Created**: 2026-07-22
**Status**: Draft
**Input**: User description: "Add Obsidian secret storage for API keys, preserve compatibility with Obsidian versions that do not support secret storage, and migrate existing API keys from users' data.json files when supported."

## Clarifications

### Session 2026-07-22

- Q: How should partial capability support behave? → A: Enable secure mode and migration only when both `SecretStorage` and `SecretComponent` are usable; otherwise retain full legacy behavior.
- Q: When should failed migrations be retried? → A: Retry during every plugin load and whenever the settings tab opens while eligible plaintext remains.
- Q: How should a same-category plaintext copy be removed when a valid secure credential already exists? → A: Show an explained “Delete insecure copy” button only while both values exist; clear `data.json` only after explicit confirmation.
- Q: After replacing or clearing a reference, what happens to the old secure credential? → A: Leave it in Obsidian storage for user management; remove only the plugin’s reference.
- Q: What if the migration’s stable credential ID already exists but is not referenced? → A: Overwrite it with the current plaintext value, then persist its reference.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Protect Existing API Keys (Priority: P1)

As an existing user on a supported Obsidian version, I want every API key already saved by the plugin to move into Obsidian's secure credential storage automatically so that plugin settings no longer retain plaintext credentials.

**Why this priority**: Existing plaintext credentials are the primary security exposure, and migration must avoid requiring users to re-enter keys.

**Independent Test**: Start the plugin with one or more configured provider or web-search keys on a supported Obsidian version, then verify that every key remains usable and no migrated plaintext value remains in the plugin's persisted settings.

**Acceptance Scenarios**:

1. **Given** a supported Obsidian version and valid plaintext API keys in existing plugin settings, **When** the updated plugin starts, **Then** every non-empty key is placed in secure credential storage, the plugin retains only its credential reference, and authenticated features continue working without user action.
2. **Given** a supported Obsidian version and no existing API keys, **When** the updated plugin starts, **Then** migration completes without creating empty credentials or changing unrelated settings.
3. **Given** secure storage fails while migrating a key, **When** migration runs, **Then** that plaintext key is retained, remains usable, and is retried on the next plugin load or settings-tab opening without losing or duplicating credentials.

---

### User Story 2 - Manage Keys Securely (Priority: P2)

As a user on a supported Obsidian version, I want to select, create, replace, and clear credentials through Obsidian's secure credential controls so that new or changed secret values are not written into the plugin's ordinary settings.

**Why this priority**: Migration alone is insufficient if subsequent settings changes return credentials to plaintext storage.

**Independent Test**: Configure each supported credential from the plugin settings on a supported Obsidian version and verify that provider and web-search operations use the selected secret while ordinary plugin settings contain no secret value.

**Acceptance Scenarios**:

1. **Given** secure credential storage is supported, **When** a user configures an API credential, **Then** the settings interface stores a credential reference rather than the secret value.
2. **Given** a configured credential reference, **When** the plugin performs an authenticated provider or web-search operation, **Then** it resolves and uses the corresponding secret value.
3. **Given** a user replaces or clears a credential selection, **When** settings are saved, **Then** subsequent operations use the new selection or report the credential as missing, the previous secret value is not copied into ordinary plugin settings, and the old secure credential remains in Obsidian storage for user management.
4. **Given** a valid secure reference and a same-category plaintext copy coexist, **When** the settings tab opens, **Then** it explains the insecure copy and shows a “Delete insecure copy” button; the plaintext is removed from `data.json` only after explicit confirmation and successful persistence.

---

### User Story 3 - Continue on Older Obsidian Versions (Priority: P3)

As a user whose Obsidian version does not support secure credential storage, I want the plugin and all existing API-key settings to keep working as before so that this security enhancement does not force an Obsidian upgrade.

**Why this priority**: Backward compatibility preserves access for users who cannot immediately update Obsidian.

**Independent Test**: Run the updated plugin in an environment without secure credential storage, load existing plaintext keys, edit a key, and verify that authenticated operations and settings persistence continue using the legacy behavior without startup or settings errors.

**Acceptance Scenarios**:

1. **Given** an Obsidian version without secure credential storage, **When** the plugin starts with existing plaintext API keys, **Then** it loads and uses those keys without attempting migration or showing unsupported controls.
2. **Given** an Obsidian version without secure credential storage, **When** a user adds, changes, or clears an API key, **Then** the legacy settings control and persistence behavior continue to work.
3. **Given** an environment that does not expose secure credential capabilities, **When** any chat, model-listing, agent, or web-search flow runs, **Then** it does not fail merely because the newer capability is absent.

### Edge Cases

- Empty, whitespace-only, null, or absent legacy key fields do not create secure credentials.
- Across credential categories, a mix of already-migrated references and remaining plaintext keys migrates only categories that still contain plaintext and preserves valid references.
- Within one credential category, a valid reference is authoritative. If plaintext also remains, the plugin does not overwrite the reference or automatically delete the plaintext; the settings tab shows an explanation and a “Delete insecure copy” button only while both values exist, and clears the plaintext only after explicit confirmation and successful persistence. If the reference is missing or invalid while plaintext remains, migration replaces the unusable reference with the stable plugin-owned reference only after secure storage and settings persistence succeed.
- Repeated startup and interrupted migration are idempotent: successful keys are not duplicated, while unsuccessful keys remain recoverable, usable through a narrowly scoped legacy fallback, and eligible for retry. If the stable plugin-owned ID already exists but is not referenced, migration overwrites it with the current plaintext value before persisting that stable reference.
- A missing or invalid referenced credential is treated as unconfigured when no eligible retained plaintext migration value exists. If migration is pending or failed and retained plaintext remains, that validated plaintext remains usable until migration succeeds. Neither path exposes the reference or secret in user-facing details or logs.
- If persisting the credential reference fails after secure storage accepts the value, the plaintext setting is not removed; a later run can recover safely.
- Migration changes credential fields only and preserves provider selection, URLs, models, frontmatter precedence, and all unrelated settings.
- All supported API-key categories are covered, including OpenAI, OpenRouter, Anthropic, Gemini, Z.AI, and web-search credentials.

## Constitution Alignment *(mandatory)*

- **Privacy and data flow**: API keys remain local to the user's Obsidian environment and are disclosed only to the provider or search service selected by the user. On supported versions, plaintext may remain in ordinary plugin settings only while migration is pending or failed, or while awaiting explicit deletion of a same-category insecure copy. Secret values must never appear in logs, notices, errors, or migration diagnostics.
- **Architecture and ownership**: Credential persistence and resolution have one ownership boundary shared by settings, provider authentication, agent/model checks, and web search. Provider metadata remains the source of truth for provider credential fields, while the settings view is limited to user interaction.
- **Compatibility and configuration**: Existing credential fields and behavior remain available when secure storage is unsupported. Migration is automatic, idempotent, and preserves the established settings/frontmatter merge order; note or agent content is not migrated or reinterpreted.
- **Platform behavior**: Capability is determined at runtime on desktop and mobile rather than assumed from a declared version. An environment is supported only when both `SecretStorage` and `SecretComponent` are usable; if either capability is absent, the environment uses full legacy settings behavior without migration and without affecting streaming, cancellation, or networking.
- **Verification and documentation**: Automated coverage must include supported and unsupported environments, complete and partial migration, retries, all credential categories, and secret redaction. User documentation must explain secure storage, migration, legacy fallback, and downgrade limitations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST determine at runtime whether the current Obsidian environment provides both usable secure credential storage and usable secure credential settings controls. Secure mode and migration MUST be enabled only when both capabilities are present; if either is absent, the environment MUST use full legacy behavior.
- **FR-002**: On supported environments, after successful migration the system MUST store only credential references in ordinary plugin settings and MUST resolve secret values only when an authenticated operation needs them. Plaintext MAY remain temporarily for a pending, failed, or unresolved migration, or until explicit user-confirmed deletion when a valid same-category reference already exists.
- **FR-003**: The settings experience MUST use Obsidian's secure credential selection and creation flow for every API-key setting when that flow is supported.
- **FR-004**: On unsupported environments, the system MUST retain the existing plaintext API-key input, persistence, and retrieval behavior without requiring an Obsidian upgrade.
- **FR-005**: On every plugin load and whenever the settings tab opens in a fully supported environment, while eligible plaintext remains, the system MUST retry migration of every non-empty plaintext API key that lacks a valid same-category reference to a distinct, plugin-owned secure credential and replace the plaintext value with its reference.
- **FR-006**: Migration MUST cover OpenAI, OpenRouter, Anthropic, Gemini, Z.AI, and web-search API-key settings.
- **FR-007**: Automatic migration MUST remove a plaintext key from ordinary plugin settings only after both secure storage of its value and persistence of its reference have succeeded. User-confirmed removal of a same-category insecure copy is governed separately by FR-017.
- **FR-008**: If any key cannot be migrated, the system MUST preserve that key in its prior usable form, continue processing other keys, allow the failed migration to be retried, and keep authenticated operations usable through the retained plaintext value when no valid secure reference can be resolved.
- **FR-009**: Migration MUST be idempotent and MUST NOT create duplicate secure credentials or reinterpret an existing credential reference as plaintext. If the deterministic plugin-owned credential ID exists without being referenced by the setting being migrated, migration MUST overwrite that ID with the current plaintext value and then persist the stable reference.
- **FR-010**: Existing authenticated workflows—including chat, title inference, model discovery, agent creation, and web search—MUST use the correct effective credential in both supported and legacy environments.
- **FR-011**: A missing or invalid referenced secret MUST be treated as unconfigured when no eligible retained plaintext migration value exists. If migration is pending or failed and retained plaintext remains, the system MUST use that validated plaintext fallback until migration succeeds. Neither path may expose the reference or secret in user-facing details or diagnostics.
- **FR-012**: Secret values MUST NOT be included in logs, notices, errors, or migration status messages.
- **FR-013**: Migration MUST NOT modify unrelated settings, note frontmatter, agent files, provider selection, or configuration precedence.
- **FR-014**: User-facing documentation MUST describe automatic migration, secure credential management, fallback behavior on older Obsidian versions, and the limitation that downgrading after migration may require credential reconfiguration.
- **FR-015**: Persisted credential fields, runtime capability members, secure-storage lookup results, and secure-control change values MUST enter the credential boundary as `unknown` and MUST be validated defensively before use; invalid values MUST be treated as absent without being logged.
- **FR-016**: Credential resolution changes for web search MUST preserve approval before tool execution and explicit result selection before any web-search content is sent to a model, with rejected or unselected content excluded from model context.
- **FR-017**: When a valid secure reference and a same-category plaintext value coexist, the settings interface MUST show an explanation and a “Delete insecure copy” button only for that state. The system MUST require explicit confirmation and successful settings persistence before clearing the plaintext value from `data.json`.
- **FR-018**: Replacing or clearing a credential reference MUST remove only the plugin’s reference and MUST leave the previously referenced secure credential in Obsidian storage for user management.

### Key Entities

- **Credential setting**: A configurable authentication value for a provider or web-search service; represented by a secret value in legacy environments and by a credential reference in supported environments.
- **Secure credential**: A named, vault-local secret managed by Obsidian and referenced by plugin settings without exposing its value there.
- **Migration state**: The per-credential observable condition—plaintext, securely referenced, empty, or migration failed—that determines whether migration or retry is required.

### Assumptions

- “All API keys” means all API-key fields currently persisted by the plugin: OpenAI, OpenRouter, Anthropic, Gemini, Z.AI, and web search. Local providers without API-key fields are outside scope.
- Plugin-owned credential names are stable and distinct per credential category, are reserved for this plugin, and may be overwritten from the current plaintext setting during migration when the stable ID exists without a persisted reference.
- Obsidian owns secure credential lifecycle; replacing or clearing a plugin reference does not delete or blank the previously referenced secure credential.
- Secure credentials are local to the vault as defined by Obsidian; cross-device secret synchronization is outside this feature's scope.
- Backward compatibility covers running this plugin version on Obsidian versions without secure storage. If a user migrates keys and later downgrades Obsidian, they may need to re-enter keys because retaining plaintext copies would defeat the security goal.
- API keys embedded in note or agent frontmatter, templates, or other vault content are outside scope because automatically extracting them would alter user-authored content and configuration precedence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In supported environments, 100% of non-empty API keys from ordinary plugin settings are securely migrated, explicitly retained for safe retry, or identified for user-confirmed deletion when a valid same-category secure reference exists; zero plaintext keys are deleted before successful migration or explicit deletion confirmation.
- **SC-002**: After a successful migration, 100% of covered authenticated workflows continue without requiring users to re-enter their keys.
- **SC-003**: In unsupported environments, 100% of existing credential settings and covered authenticated workflows behave as they did before the update, with no errors caused by the absent secure-storage capability.
- **SC-004**: Repeating startup or migration at least 10 times produces no duplicate plugin-owned credentials and no changes after the first successful migration.
- **SC-005**: Across supported-environment migration, settings editing, authentication failures, and debug logging tests, zero secret values appear in ordinary settings, logs, notices, or error messages.
- **SC-006**: A user can select or replace any covered credential in under 60 seconds on a supported environment and use the corresponding feature without additional plugin configuration.
