# Tasks: Secure API Key Storage

**Input**: Design documents from `/specs/001-secret-api-storage/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/credential-contract.md`, `quickstart.md`

**Tests**: The specification and constitution require deterministic coverage for migration, full and partial capability, all credential categories, authenticated workflows, retries, explicit insecure-copy deletion, approval boundaries, and secret redaction.

**Organization**: Tasks are grouped by user story so automatic migration, secure credential management, and legacy compatibility can each be implemented and validated as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its stated prerequisites because it uses different files and has no dependency on another incomplete parallel task.
- **[Story]**: Maps the task to User Story 1, 2, or 3 from `spec.md`.
- Every task names exact repository paths.

## Phase 1: Setup (Shared Test Infrastructure)

**Purpose**: Prepare the existing Jest harness for storage-present, UI-present, partial-capability, and capability-absent tests without adding dependencies.

- [ ] T001 Extend the Obsidian test double with independently optional in-memory `SecretStorage`, `App.secretStorage`, and callback-capable `SecretComponent` mocks in `src/__mocks__/obsidian.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the shared persisted model, credential metadata, combined capability boundary, and explicit dependency wiring required by every story.

**⚠️ CRITICAL**: Complete this phase before starting any user story.

- [ ] T002 Add default-empty `apiKeySecretId`, `openrouterApiKeySecretId`, `anthropicApiKeySecretId`, `geminiApiKeySecretId`, `zaiApiKeySecretId`, and `webSearchApiKeySecretId` fields without changing legacy key fields in `src/Models/Config.ts`
- [ ] T003 Add typed secret-reference settings and deterministic lowercase/dash owned IDs to provider credential metadata, plus the adjacent web-search credential definition, in `src/Services/Providers/ProviderRegistry.ts`
- [ ] T004 [P] Add completeness tests proving all five keyed providers and web search have unique legacy fields, reference fields, and valid stable IDs in `src/Services/Providers/ProviderRegistry.test.ts`
- [ ] T005 [P] Add unit tests that feed persisted fields, storage members, the `SecretComponent` constructor, lookup results, and control values as `unknown`, proving secure mode requires both storage and UI capabilities and rejects malformed values in `src/Services/ApiAuthService.test.ts`
- [ ] T006 Implement defensively validated combined storage/UI capability detection and on-demand provider/web-search credential resolution with opaque references in `src/Services/ApiAuthService.ts`
- [ ] T007 Inject `App` and the runtime `SecretComponent` capability explicitly into the credential boundary while preserving `ServiceContainer` as the sole composition root in `src/core/ServiceContainer.ts`
- [ ] T008 Run the foundational subset for `src/Services/Providers/ProviderRegistry.test.ts` and `src/Services/ApiAuthService.test.ts` and resolve failures in those files before story work

**Checkpoint**: The settings model represents plaintext and references unambiguously, and secure mode activates only when both required runtime capabilities validate.

---

## Phase 3: User Story 1 - Protect Existing API Keys (Priority: P1) 🎯 MVP

**Goal**: Automatically migrate existing provider and web-search plaintext keys into stable secure credentials without data loss, retrying on plugin load and settings-tab opening while keeping failed keys usable.

**Independent Test**: Seed all six legacy fields in a fully supported runtime and verify load migration leaves only references and every operation resolves the original synthetic secret. Repeat ten times, retry a failure by reopening settings, and verify an existing unreferenced owned ID is overwritten from current plaintext without duplicates.

### Tests for User Story 1

- [ ] T009 [US1] Add migration tests for all six categories, blank values, cross-category mixed state, invalid-reference replacement, existing unreferenced owned-ID overwrite, ten-run idempotence, no more than one lookup plus one write per category per migration pass, and storage/save failure with continued plaintext authentication in `src/Services/ApiAuthService.test.ts`
- [ ] T010 [P] [US1] Add integration tests proving per-category persistence, `saveData` rollback, unrelated-setting preservation, migration retry on every plugin load and exactly once per settings-tab opening while eligible plaintext remains, waiting before credential rows render, refreshing after completion, and stopping retries after successful migration in `src/Services/SettingsService.test.ts` and `src/Views/ChatGPT_MDSettingsTab.test.ts`
- [ ] T011 [P] [US1] Add secure web-search tests proving resolved values are used, execution requires approval, rejected calls do not execute, and only selected results enter model context in `src/Services/ToolService.test.ts`, `src/Services/Tools/defaultTools.test.ts`, and `src/Services/Tools/ToolApprovalCoordinator.test.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Implement sequential per-category migration with stable-ID overwrite from authoritative plaintext, valid-reference-first resolution, failed-migration plaintext fallback, rollback, continue-on-error summaries, and redacted diagnostics in `src/Services/ApiAuthService.ts`
- [ ] T013 [US1] Coordinate transactional migration after settings load, persist each category safely, and expose an idempotent settings-open retry operation that processes only eligible plaintext in `src/Services/SettingsService.ts`
- [ ] T014 [US1] Resolve web-search credentials at availability and approved execution time instead of reading `webSearchApiKey` directly in `src/Services/ToolService.ts` and `src/Services/Tools/defaultTools.ts`
- [ ] T015 [US1] Ensure initial migration completes before settings registration and background model initialization in `src/main.ts`
- [ ] T016 [US1] Trigger exactly one service-owned migration retry whenever the settings tab opens, await completion before rendering credential rows, and guard against recursive or duplicate rendering without placing migration logic in the view in `src/Views/ChatGPT_MDSettingsTab.ts`
- [ ] T017 [US1] Run the US1 subset for `src/Services/ApiAuthService.test.ts`, `src/Services/SettingsService.test.ts`, `src/Services/ToolService.test.ts`, `src/Services/Tools/defaultTools.test.ts`, and `src/Services/Tools/ToolApprovalCoordinator.test.ts` and resolve failures in those files

**Checkpoint**: Existing keys migrate transactionally and idempotently, failed keys remain usable and retryable, stable IDs do not duplicate, and web-search privacy boundaries remain enforced.

---

## Phase 4: User Story 2 - Manage Keys Securely (Priority: P2)

**Goal**: Let fully supported users select, create, replace, and clear native secure references, explicitly delete same-category insecure copies, and retain old secure records for Obsidian-managed lifecycle.

**Independent Test**: Select, replace, and clear all six references and verify only IDs enter `data.json`, old secure records remain, and authenticated workflows use the selected secret or existing missing-key behavior. Seed a valid reference plus plaintext and verify the explained deletion button appears only for that state and clears plaintext only after its explicit click and successful save.

### Tests for User Story 2

- [ ] T018 [US2] Add settings tests for six credential definitions, validated `SecretComponent` values, reference-only persistence, replace/clear old-record retention, conditional insecure-copy explanation/button, explicit deletion, and save-failure plaintext retention in `src/Views/ChatGPT_MDSettingsTab.test.ts` and `src/Services/SettingsService.test.ts`
- [ ] T019 [P] [US2] Add secure-reference and missing-reference chat request tests in `src/Commands/ChatHandler.test.ts`
- [ ] T020 [P] [US2] Add secure-reference and missing-reference title inference tests in `src/Commands/InferTitleHandler.test.ts`
- [ ] T021 [P] [US2] Add secure-reference and missing-reference model discovery/selection tests in `src/Commands/ModelSelectHandler.test.ts`
- [ ] T022 [P] [US2] Add secure-reference and missing-reference agent validation/creation tests in `src/Views/CreateAgentModal.test.ts`

### Implementation for User Story 2

- [ ] T023 [US2] Mark provider and web-search API-key definitions as credential settings and associate each legacy field with its `*SecretId` field in `src/Views/settingsSchema.ts`
- [ ] T024 [US2] Add a service-owned operation that clears a same-category plaintext value only after a valid reference, explicit UI request, and successful settings persistence, rolling back on failure, in `src/Services/SettingsService.ts`
- [ ] T025 [US2] Render validated `SecretComponent` controls in fully supported mode, persist replace/clear as reference changes only, retain old secure records, and render the explained “Delete insecure copy” button only for valid-reference/plaintext pairs in `src/Views/ChatGPT_MDSettingsTab.ts`
- [ ] T026 [US2] Audit and route chat, title inference, model selection, and agent creation through `ApiAuthService`, preserving sanitized missing-key behavior, in `src/Commands/ChatHandler.ts`, `src/Commands/InferTitleHandler.ts`, `src/Commands/ModelSelectHandler.ts`, and `src/Views/CreateAgentModal.ts`
- [ ] T027 [US2] Run the US2 subset for `src/Views/ChatGPT_MDSettingsTab.test.ts`, `src/Services/SettingsService.test.ts`, `src/Commands/ChatHandler.test.ts`, `src/Commands/InferTitleHandler.test.ts`, `src/Commands/ModelSelectHandler.test.ts`, and `src/Views/CreateAgentModal.test.ts` and resolve failures in those files

**Checkpoint**: Native credential management persists references only, deletion of insecure copies is explicit and safe, and reference changes do not delete old Obsidian credentials.

---

## Phase 5: User Story 3 - Continue on Older Obsidian Versions (Priority: P3)

**Goal**: Preserve plaintext controls, persistence, and authenticated workflows whenever storage, secure UI, or both capabilities are unavailable.

**Independent Test**: Run storage-only, UI-only, and neither-capability environments; load/edit/clear legacy keys and verify no migration or secure control occurs while chat, model, agent, and search flows receive legacy values without startup errors.

### Tests for User Story 3

- [ ] T028 [P] [US3] Add storage-only, UI-only, and neither-capability tests proving no migration, legacy provider/web-search resolution, safe startup, and unchanged plaintext persistence in `src/Services/ApiAuthService.test.ts` and `src/Services/SettingsService.test.ts`
- [ ] T029 [P] [US3] Add settings tests proving every partial/absent capability combination renders legacy text inputs, supports add/change/clear, and never constructs `SecretComponent` or shows insecure-copy controls in `src/Views/ChatGPT_MDSettingsTab.test.ts`

### Implementation for User Story 3

- [ ] T030 [US3] Harden combined capability guards so any missing storage/UI capability skips migration, ignores reference fields, resolves legacy values, and renders legacy controls in `src/Services/ApiAuthService.ts`, `src/Services/SettingsService.ts`, and `src/Views/ChatGPT_MDSettingsTab.ts`
- [ ] T031 [US3] Add downgrade tests proving a partial/unsupported runtime never sends a persisted `*SecretId` as a provider or web-search credential in `src/Services/ApiAuthService.test.ts` and `src/Services/ToolService.test.ts`
- [ ] T032 [US3] Run the US3 subset for `src/Services/ApiAuthService.test.ts`, `src/Services/SettingsService.test.ts`, `src/Views/ChatGPT_MDSettingsTab.test.ts`, and `src/Services/ToolService.test.ts` and resolve failures in those files

**Checkpoint**: Partial and older runtimes retain full legacy behavior, and downgraded environments fail closed instead of sending reference IDs.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete privacy verification, documentation, manual platform coverage, and repository quality gates.

- [ ] T033 [P] Document combined-capability requirements, load/settings-open retries, migration, native controls, insecure-copy deletion, retained old credentials, legacy fallback, and downgrade reconfiguration in `README.md` and `SECURITY.md`
- [ ] T034 [P] Add a user-facing release note for secure storage, explicit insecure-copy deletion, old-record retention, fallback, and downgrade limitations in `CHANGELOG.md`
- [ ] T035 Add assertions that synthetic secret values and reference IDs never appear in logger output, notices, errors, migration summaries, malformed-value cases, or successfully migrated settings in `src/Utilities/Logger.test.ts`, `src/Services/ApiAuthService.test.ts`, and `src/Services/SettingsService.test.ts`
- [ ] T036 Execute and record the full/partial capability, desktop/mobile-where-available, retry, collision, deleted-reference, confirmed-deletion, old-record retention, approval/result-selection, and downgrade manual scenarios in `specs/001-secret-api-storage/quickstart.md`
- [ ] T037 Run `npm run format:check`, `npm run lint`, and `npm run typecheck`; fix new failures in affected `src/**/*.ts` files and record any pre-existing warnings in `specs/001-secret-api-storage/quickstart.md`
- [ ] T038 Run `npm test -- --runInBand` and `npm run build`; fix feature regressions in affected `src/**/*.test.ts` and `src/**/*.ts` without editing generated `main.js`, and record final results in `specs/001-secret-api-storage/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** starts immediately.
- **Phase 2** depends on T001 and blocks all stories. T002-T003 establish model/metadata; T004-T005 can then proceed in parallel; T006 depends on T002-T005; T007 depends on T006; T008 validates the foundation.
- **US1** depends on Phase 2. T009-T011 define regressions; T012 depends on T009; T013 depends on T010/T012; T014 depends on T006/T011; T015-T016 depend on T013; T017 validates the story.
- **US2** depends on Phase 2 secure resolution. T019-T022 can proceed in parallel; T023 precedes T025; T024 depends on T018 and precedes T025; T026 follows workflow tests; T027 validates the story.
- **US3** depends on Phase 2 combined capability detection. T028-T029 can proceed in parallel; T030 implements both expectations; T031 verifies downgrade safety; T032 validates the story.
- **Phase 6** depends on all selected stories. T033-T034 can proceed in parallel; privacy/manual/full quality gates follow.

### User Story Dependencies

```text
Setup T001
   ↓
Foundation T002-T008
   ├──→ US1 Protect Existing Keys T009-T017 ─────┐
   ├──→ US2 Manage Keys Securely T018-T027 ─────┼──→ Polish T033-T038
   └──→ US3 Older-Version Compatibility T028-T032 ┘
```

- **US1 (P1)**: No dependency on another story; settings-open retry uses the shared tab but not US2 controls.
- **US2 (P2)**: No dependency on US1 migration when tests seed references/mixed state directly; integrating US1 adds automatic migration.
- **US3 (P3)**: No dependency on US1/US2; tests construct each partial/absent capability state directly.

### Within Each User Story

1. Add regression tests before or alongside implementation.
2. Implement service/model behavior before UI/workflow integration.
3. Run the focused story subset before declaring its checkpoint complete.
4. Never bypass tool approval, result selection, or settings persistence rollback.

## Parallel Opportunities

- T004 and T005 can run together after T002-T003.
- US1 test tasks T010 and T011 can be authored concurrently with T009 in distinct files.
- US2 workflow tests T019-T022 can run concurrently while the UI/service stream handles T018 and T023-T025.
- US3 service tests T028 and view tests T029 can run concurrently.
- After Phase 2, stories may be assigned to separate developers if shared-file changes are sequenced; P1 → P2 → P3 remains the lowest-conflict route.
- T033 and T034 can run concurrently.

## Parallel Example: User Story 1

```text
Task T009: Migration/idempotence/collision tests in src/Services/ApiAuthService.test.ts
Task T010: Persistence and load/settings-open retry tests in src/Services/SettingsService.test.ts
Task T011: Resolved web-search approval/selection tests in src/Services/ToolService.test.ts, src/Services/Tools/defaultTools.test.ts, and src/Services/Tools/ToolApprovalCoordinator.test.ts
```

## Parallel Example: User Story 2

```text
Task T018: Native settings and insecure-copy deletion tests in src/Views/ChatGPT_MDSettingsTab.test.ts and src/Services/SettingsService.test.ts
Task T019: Chat credential tests in src/Commands/ChatHandler.test.ts
Task T020: Title credential tests in src/Commands/InferTitleHandler.test.ts
Task T021: Model credential tests in src/Commands/ModelSelectHandler.test.ts
Task T022: Agent credential tests in src/Views/CreateAgentModal.test.ts
```

## Parallel Example: User Story 3

```text
Task T028: Partial-capability service tests in src/Services/ApiAuthService.test.ts and src/Services/SettingsService.test.ts
Task T029: Partial-capability settings UI tests in src/Views/ChatGPT_MDSettingsTab.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001-T008.
2. Complete T009-T017.
3. Stop and validate all six categories, load/settings-open retry, ten repeated migrations, owned-ID overwrite, and injected storage/save failures.
4. Demo using synthetic credentials and sanitized `data.json` evidence.

### Incremental Delivery

1. **Foundation**: Represent references and validate combined capabilities.
2. **US1 MVP**: Protect existing plaintext keys automatically and retry safely.
3. **US2**: Add native management, explicit insecure-copy deletion, and workflow coverage.
4. **US3**: Prove full legacy behavior for every partial/absent capability combination.
5. **Polish**: Document, manually validate, and pass all repository gates.

### Parallel Team Strategy

1. Complete Setup and Foundation together.
2. Agree on the `ApiAuthService`/`SettingsService` interfaces before splitting stories.
3. Sequence edits to shared `ApiAuthService.test.ts`, `SettingsService.test.ts`, and `ChatGPT_MDSettingsTab.test.ts` even when other story work is parallel.
4. Integrate in priority order and rerun each story checkpoint after rebasing.

## Notes

- `[P]` means concurrent only after shared prerequisites are complete.
- Provider operational metadata remains in `ProviderRegistry`; adapters do not change.
- Use obvious synthetic placeholders in tests and assert their absence from outputs; never commit real credentials.
- `main.js` is generated and must not be edited.
- Commit after each task or coherent test/implementation pair.
