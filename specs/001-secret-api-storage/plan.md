# Implementation Plan: Secure API Key Storage

**Branch**: `001-secret-api-storage` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-secret-api-storage/spec.md`

## Summary

Move OpenAI, OpenRouter, Anthropic, Gemini, Z.AI, and web-search keys from plaintext plugin settings into Obsidian `SecretStorage` only when both secure storage and native `SecretComponent` controls are usable; otherwise preserve full legacy behavior. Persist distinct secret-reference fields, centralize defensively validated capability detection/resolution/idempotent migration in the authentication credential boundary, retry on plugin load and settings-tab opening, and resolve credentials only at authenticated operations. Stable plugin-owned IDs and per-category persistence prevent data loss; a failed key remains usable through plaintext fallback, valid-reference/plaintext pairs require an explained user-confirmed deletion action, and replacing a reference leaves the old Obsidian credential user-managed.

## Technical Context

**Language/Version**: TypeScript 5.9.3 on Node.js 24+
**Primary Dependencies**: Obsidian API (`App.secretStorage`, `SecretStorage`, `SecretComponent`, settings components), AI SDK 7/provider SDKs, Zod; no new dependency
**Storage**: Obsidian vault-local secure credential storage plus local plugin `data.json`; fully supported environments contain references after successful migration, with plaintext retained only for pending/failed migration or confirmed-deletion state; partial/unsupported environments retain legacy plaintext
**Testing**: Jest 30 with colocated `src/**/*.test.ts`, capability-shaped Obsidian mocks, and targeted desktop/mobile Obsidian checks
**Target Platform**: Obsidian desktop and mobile; secure mode requires both storage and UI capability at runtime, while the manifest continues supporting 0.15.0 through full legacy fallback
**Project Type**: Obsidian community plugin bundled by esbuild into CommonJS
**Performance Goals**: At most two synchronous secure-storage operations per credential category per migration pass—one lookup and, when migration is required, one write—plus at most one small settings save per changed category; no network calls; one local synchronous lookup per authenticated operation; settings-open retry processes only eligible plaintext categories
**Constraints**: Never log resolved secrets or references; preserve and test approval/result-selection boundaries; accept persisted/runtime/UI values as `unknown` and validate them; use runtime capabilities rather than versions; preserve CommonJS/mobile compatibility and configuration merge order; keep retained keys usable after failure; never delete old secure records through reference changes
**Scale/Scope**: Six credential categories; config/metadata, `ApiAuthService`, `SettingsService`, `ServiceContainer`, settings schema/tab, web-search wiring, mocks/tests, README/security/changelog; no note/frontmatter migration and no provider protocol changes

## Constitution Check

*GATE: Passed before Phase 0 research; passed again after Phase 1 design.*

### Pre-research evaluation

- **Privacy and human control — PASS**: Secrets stay vault-local until sent to the resolved provider/search endpoint and are absent from diagnostics. Web-search changes explicitly retain approval before execution and selection before results enter model context. The insecure-copy action explains the risk and requires an intentional click before plaintext removal.
- **Architecture and ownership — PASS**: `ServiceContainer` remains the sole composition root. `ApiAuthService` owns validated capability/resolution/migration behavior; `SettingsService` owns persistence and retry operations; the settings view triggers service behavior and renders controls. Provider credential metadata remains in `ProviderRegistry`; adapters do not change.
- **Compatibility and configuration — PASS**: Secure mode requires both capabilities; storage-only, UI-only, and neither-capability runtimes use full legacy behavior. Separate legacy/reference fields prevent reference strings from being sent after downgrade. Migration is per-category/idempotent and leaves merge order, URLs, models, note/agent content, and unrelated settings unchanged.
- **Verification — PASS**: Automated coverage includes all categories, malformed external values, full/partial capability, load/settings-open retries, stable-ID overwrite, storage/save failure and fallback usability, mixed states, confirmation-gated deletion, old-record retention, missing references, workflow routing, approval/result filtering, and redaction. Manual checks cover desktop/mobile and downgrade. Required commands: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test -- --runInBand`, `npm run build`.
- **Simplicity and documentation — PASS**: No dependency/framework is added. The design extends current auth/settings/registry/schema boundaries. Update `README.md`, `SECURITY.md`, and `CHANGELOG.md`; update additional guidance only if implementation changes documented message flow.

### Post-design re-evaluation

- **Privacy and human control — PASS**: The contract prohibits secret/reference diagnostics, preserves tool approval and selected-results-only sharing, and makes insecure-copy removal explicit and persistence-safe.
- **Architecture and ownership — PASS**: Capability, migration, resolution, persistence, and UI responsibilities are explicit; settings-open retry invokes service behavior rather than placing migration logic in the view.
- **Compatibility and configuration — PASS**: Combined-capability fallback, valid-reference-first resolution, failed-migration plaintext fallback, manual mixed-state deletion, deterministic ID overwrite, and retained old secure records have defined states/transitions.
- **Verification — PASS**: `quickstart.md` covers automated and manual full/partial capability, retry, deletion confirmation, owned-ID collision, old-record retention, downgrade, and privacy scenarios.
- **Simplicity and documentation — PASS**: The existing plugin structure and Obsidian APIs suffice; no speculative deletion API or parallel credential architecture is introduced.

No constitutional violations require complexity exceptions.

## Phase 0: Research

Research is complete in [research.md](./research.md); no technical questions remain unresolved.

Key decisions:

1. Enable secure mode only when both storage and native secure UI capabilities validate at runtime.
2. Keep legacy values and secret references in distinct fields.
3. Use stable category IDs; overwrite an existing unreferenced owned ID from current authoritative plaintext.
4. Keep credential behavior in the auth/settings boundary with explicit container wiring.
5. Migrate transactionally per category on plugin load and settings-tab opening while eligible plaintext remains.
6. Prefer valid references; use plaintext only for pending/failed migration when no valid reference resolves.
7. Preserve valid-reference/plaintext pairs until the explained deletion action is confirmed and saved.
8. Replacing/clearing a reference leaves old secure records in Obsidian storage.
9. Validate persisted, capability, lookup, and UI values from `unknown`.
10. Preserve and test web-search approval and selected-result filtering.

## Phase 1: Design and Contracts

- [data-model.md](./data-model.md) defines credential metadata, persisted pairs, secure records, migration states, user-confirmed deletion, ID overwrite, old-record retention, transitions, and invariants.
- [contracts/credential-contract.md](./contracts/credential-contract.md) defines combined capability, persistence, resolution, retry/migration, settings UI, authenticated workflow, and privacy contracts.
- [quickstart.md](./quickstart.md) defines implementation order, automated assertions, and manual full/partial capability scenarios.
- `.specify/scripts/bash/update-agent-context.sh generic` is run after artifact synchronization; the generic target may report no predefined context file.

## Phase 2: Implementation Planning

Implementation is decomposed by `/speckit-tasks`; this planning command does not regenerate `tasks.md`. The next task generation must preserve this order:

1. Persisted reference fields, metadata, capability-shaped mocks, and defensive validation.
2. Combined storage/UI capability detection and explicit container wiring.
3. Stable-ID migration/resolution with load and settings-open retry, rollback, and fallback usability.
4. Native/legacy settings controls, confirmation-gated insecure-copy deletion, and old-record retention.
5. Provider/model/agent/web-search routing and approval/result-selection regressions.
6. Partial capability, downgrade, missing-reference, idempotence, collision, and redaction coverage.
7. Documentation, manual desktop/mobile checks, and full repository quality gates.

## Project Structure

### Documentation (this feature)

```text
specs/001-secret-api-storage/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── credential-contract.md
└── tasks.md                       # Regenerated by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── main.ts                        # Startup load/migration ordering
├── core/
│   └── ServiceContainer.ts        # Explicit capability/credential wiring
├── Commands/
│   ├── ChatHandler.ts
│   ├── InferTitleHandler.ts
│   └── ModelSelectHandler.ts      # Resolved provider credentials
├── Services/
│   ├── ApiAuthService.ts          # Validation, capability, resolution, migration
│   ├── SettingsService.ts         # Persistence and load/settings-open retry
│   ├── SettingsMigration.ts       # Existing non-secret migrations remain isolated
│   ├── ToolService.ts             # Resolved web-search availability/approval flow
│   ├── Tools/
│   │   ├── defaultTools.ts
│   │   └── ToolApprovalCoordinator.ts
│   └── Providers/
│       └── ProviderRegistry.ts    # Provider credential/reference metadata
├── Views/
│   ├── ChatGPT_MDSettingsTab.ts   # Native/legacy controls and insecure-copy action
│   ├── CreateAgentModal.ts
│   └── settingsSchema.ts
├── Models/
│   └── Config.ts                  # Persisted reference fields/defaults
├── Utilities/
│   └── Logger.ts                  # Redaction defense
├── __mocks__/
│   └── obsidian.ts                # Storage/UI capability test doubles
└── **/*.test.ts                   # Colocated deterministic regressions

README.md
SECURITY.md
CHANGELOG.md
manifest.json                       # No minAppVersion increase
```

**Structure Decision**: Keep the existing single-plugin architecture. Extend the explicit composition root, authentication/settings services, provider registry, schema-driven settings view, and colocated Jest suite. The settings view triggers one service-owned retry per display cycle and renders credential rows only after that retry settles; a per-display guard prevents recursive or duplicate rendering. The view may trigger a service-owned confirmed cleanup operation, but it must not own migration/persistence logic. No new subsystem, dependency, or secure-record deletion abstraction is needed.

## Complexity Tracking

No violations. The design adds no framework, dependency, project, or constitutional exception.
