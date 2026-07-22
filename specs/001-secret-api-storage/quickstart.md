# Quickstart: Implement and Verify Secure API Key Storage

## Implementation sequence

1. Add optional/default-empty `*SecretId` fields to `src/Models/Config.ts`.
2. Extend credential metadata in `src/Services/Providers/ProviderRegistry.ts` and define web-search credential metadata.
3. Expand `src/Services/ApiAuthService.ts` with defensive `unknown` validation, runtime capability detection, valid-reference-first resolution, failed-migration plaintext fallback, stable IDs, and safe per-category migration; wire `App` explicitly from `src/core/ServiceContainer.ts`.
4. Make `src/Services/SettingsService.ts` coordinate safe per-category migration after `loadSettings()` and on each settings-tab opening while eligible plaintext remains.
5. Add a credential schema type in `src/Views/settingsSchema.ts`; render `SecretComponent` only when both storage and UI capabilities exist, otherwise preserve full legacy behavior. Add the explained, confirmation-gated “Delete insecure copy” action for valid-reference/plaintext pairs in `src/Views/ChatGPT_MDSettingsTab.ts`.
6. Route provider and web-search checks/execution through credential resolution. Do not change tool approval behavior or provider adapter protocols.
7. Extend `src/__mocks__/obsidian.ts` and add focused migration, resolution, UI, registry completeness, tool, and logging regression tests.
8. Update `README.md`, `SECURITY.md`, and release guidance/changelog as applicable with migration, fallback, and downgrade behavior.

## Automated verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
```

Required focused assertions:

- all six nonblank legacy fields migrate in supported mode;
- empty/whitespace fields create no secrets;
- partial capability (storage-only or UI-only) uses full legacy behavior and does not migrate;
- migration retries on every plugin load and settings-tab opening while eligible plaintext remains;
- cross-category mixed state migrates only plaintext categories;
- same-category valid references remain authoritative and plaintext remains until the explained deletion action is confirmed and saved;
- same-category invalid references are replaced only after retained plaintext is securely stored and persisted;
- an existing unreferenced owned ID is overwritten from current plaintext before its reference is persisted;
- replacing/clearing a reference leaves the old secure credential in Obsidian storage;
- malformed persisted fields, capabilities, lookup results, and UI changes are treated as absent and never logged;
- one storage failure does not block other categories and the failed plaintext key remains usable;
- save failure restores usable plaintext and retry uses the same ID;
- ten repeated runs produce no additional IDs or settings changes;
- missing referenced secrets resolve as unconfigured;
- unsupported mode preserves old reads, edits, and persistence;
- supported UI persists references while unsupported UI renders text fields;
- chat, title, models, agent creation, Brave/custom search receive resolved secrets;
- web search still requires approval before execution and only selected results enter model context;
- settings snapshots, notices, errors, and logger output contain no synthetic secret values.

## Manual Obsidian verification

### Supported Obsidian (desktop and mobile where available)

1. Back up a test vault and configure distinct test keys for all six categories with the previous plugin build.
2. Install the feature build and start Obsidian.
3. Confirm provider model listing/chat and web search still authenticate.
4. Inspect `.obsidian/plugins/chatgpt-md/data.json`: legacy key fields are absent and only reference IDs remain.
5. Open settings and confirm native secret controls appear; select, create, replace, and clear credentials, then confirm old secure records remain available for user management.
6. Seed a valid reference plus same-category plaintext, open settings, verify the explanation/button appears only there, then click the explicitly labeled deletion button and verify plaintext clears only after the save succeeds.
7. Delete one selected secret through Obsidian's credential management, then confirm the plugin reports the key as missing without exposing its ID.
8. Force one migration storage/save failure, then confirm the retained plaintext credential still authenticates and succeeds on the next plugin load or settings-tab retry.
9. Seed an unreferenced owned ID with a different synthetic value and confirm migration overwrites it from current plaintext without creating a duplicate.
10. Request web search, reject execution once, then approve it and select only a subset of results; confirm rejection performs no search and unselected results do not enter model context.
11. Reload repeatedly and confirm no duplicate plugin-owned secret names appear.

### Unsupported Obsidian

1. Run storage-absent, UI-absent, and both-absent runtimes.
2. Confirm settings show existing text inputs and existing plaintext keys remain usable/editable.
3. Exercise chat, title inference, model selection, agent creation, Brave search, and custom search.
4. Confirm startup and settings produce no missing-capability errors.

### Downgrade behavior

After migration, run the plugin in an unsupported environment and confirm migrated credentials are reported missing rather than sending reference IDs. Re-enter legacy keys if continued use on that environment is required, as documented.

## Implementation verification record

Recorded for the feature implementation:

| Scenario | Result | Evidence |
|---|---|---|
| Full secure capability, six-category migration, mixed state, invalid/deleted reference, deterministic-ID collision, save rollback, ten retries | PASS | Deterministic Jest coverage in `ApiAuthService.test.ts` and `SettingsService.test.ts` |
| Storage-only, UI-only, and neither capability; downgrade never sends an opaque reference | PASS | Capability and legacy-resolution Jest coverage in `ApiAuthService.test.ts` |
| Confirmed deletion and failed-save retention | PASS | Service coverage in `SettingsService.test.ts`; UI action is capability-gated in `ChatGPT_MDSettingsTab.ts` |
| Old secure-record retention on replace/clear | PASS | Reference updates never invoke a secure-record deletion API |
| Web-search approval, rejected execution, secure resolution, and selected-results-only context | PASS | `ToolService.test.ts` |
| Desktop Obsidian interactive walkthrough | NOT AVAILABLE IN CLI HARNESS | Repeat the supported-Obsidian checklist above in a test vault before release |
| Mobile Obsidian interactive walkthrough | NOT AVAILABLE IN CLI HARNESS | Repeat on mobile where the release test environment is available |

### Final automated gates

- `npm run format:check` — PASS
- `npm run lint` — PASS (no warnings)
- `npm run typecheck` — PASS
- `npm test -- --runInBand` — PASS (23 suites, 190 tests)
- `npm run build` — PASS

No pre-existing warnings were emitted by the final lint run. The build-generated `main.js` was not edited by hand.
