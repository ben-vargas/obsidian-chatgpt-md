# Refactor Backlog for Implementation Agents

Each item is intended to be independently implementable.

## A. Build/test/tooling

### A1. Fix TypeScript deprecation build failure

- Files: `tsconfig.json`, maybe `package.json`
- Validate: `npm run build`
- Notes: Prefer modern `moduleResolution`; use `ignoreDeprecations` only as temporary compatibility.

### A2. Fix Jest startup failure

- Files: `jest.config.js`, maybe `tsconfig.test.json`
- Validate: `npm test -- --runInBand`
- Notes: Ensure tests fail only on assertions, not TS config.

### A3. Standardize package manager

- Files: `package.json`, one lockfile, docs
- Validate: fresh install with chosen command
- Notes: Current scripts include `yarn build` while normal commands use `npm`.

### A4. Ignore/remove generated noise

- Files: `.gitignore`, generated files policy docs
- Targets: `.DS_Store`, `coverage/`, maybe `main.js`

---

## B. Documentation

### B1. Rewrite `AGENTS.md`

- Remove stale references to `ServiceLocator`, `CommandRegistry`, provider service classes, `FrontmatterService`, `ToolRegistry`, `ToolExecutor`.
- Add current architecture map from `03-agent-contributor-guidelines.md`.

### B2. Rewrite provider creation docs

- File: `docs/CREATE_SERVICE.md`
- New title suggestion: `docs/CREATE_PROVIDER.md`
- Describe adapter pattern and provider registry target.

### B3. Update message flow docs

- File: `docs/message-flow.md`
- Use current `ChatHandler` -> `EditorService`/`SettingsService` -> `AiProviderService` -> `MessageService` flow.

### B4. Add `CONTRIBUTING.md`

Minimum content:

- install command
- validation commands
- architecture map
- PR size guidance
- generated file policy

---

## C. Provider registry

### C1. Create provider registry with adapter factories

- New file: `src/Services/Providers/ProviderRegistry.ts`
- Move adapter map from `AiProviderService`.
- Test registry returns all current providers.

### C2. Derive default API URLs from registry

- Update: `src/Commands/CommandUtilities.ts`
- Remove hand-coded provider URL map.

### C3. Derive model fetching loop from registry

- Update: `fetchAvailableModels()`
- Preserve behavior:
  - Ollama and LM Studio fetched without API keys.
  - API-key providers fetched only when key is valid.
  - Each fetch has timeout fallback.

### C4. Derive settings provider sections from registry

- Update: `ChatGPT_MDSettingsTab` after schema extraction.
- Keep labels/descriptions stable where possible.

### C5. Derive provider frontmatter fields from registry

- Update: `SettingsService.generateFrontmatter()`.
- Preserve current frontmatter output shape.

---

## D. AiProviderService decomposition

### D1. Extract provider selection/cache helper

- Move provider cache key creation and AI SDK provider creation out of `AiProviderService`.
- Add unit tests for cache invalidation by provider/base URL/API key.

### D2. Extract stream consumer

- Move stream iteration and final error checking from `AiProviderService`.
- Test abort behavior and text aggregation.

### D3. Extract error formatter

- Move `formatStreamError()` and retry detection.
- Test known provider error shapes.

### D4. Extract title inference

- Move `inferTitle()` into a small service/helper.
- Keep public `AiProviderService.inferTitle()` delegating initially for compatibility.

### D5. Remove unconditional console logs

- Add logger first or replace with debug-gated helper.

---

## E. Settings UI simplification

### E1. Extract settings schema

- New file: `src/Views/settingsSchema.ts`
- `ChatGPT_MDSettingsTab.display()` imports schema.
- No behavior change.

### E2. Add parser/coercer per setting type

- Text inputs for numeric settings should save numbers.
- Add tests for parser helpers if implemented as pure functions.

### E3. Extract group ordering

- Move group order and collapsible group list into constants.

### E4. Reduce inline styling

- Prefer CSS classes in `styles.css` over direct `style` mutations where simple.

---

## F. ToolService decomposition

### F1. Extract default tool definitions

- New file: `src/Services/Tools/defaultTools.ts`
- Keep `ToolService.registerDefaultTools()` as a small loop.

### F2. Extract approval coordination

- New helper/class for opening approval modals and returning decisions.
- Keep all human-in-the-loop behavior unchanged.

### F3. Extract tool result formatting

- Pure functions for vault search, file read, and web search result rendering/filtering.
- Add unit tests.

### F4. Type tool calls minimally

- Define a small internal `NormalizedToolCall` type.
- Convert raw provider tool calls from `unknown` to this type with a guard.

---

## G. Error/notification consistency

### G1. Route direct `Notice` usage through `NotificationService` where non-UI

- Start with services and command handlers.
- Leave modal/view direct UI code for later.

### G2. Add redaction utility

- Ensure API keys are redacted in log contexts.

### G3. Make `ErrorService` less complex

- Split API error classification into pure helpers.
- Current lint reports complexity 30 for `handleApiError`.

---

## H. Tests to add after helpers are extracted

1. Provider registry includes all providers and required metadata.
2. Effective API URL resolution priority.
3. Settings numeric coercion.
4. Frontmatter merge priority:
   - default config
   - default frontmatter
   - global settings
   - agent frontmatter
   - note frontmatter
5. Tool availability by settings.
6. Tool result formatting excludes unapproved results.
7. Stream consumer abort path.
8. Provider cache invalidation.

---

## Suggested implementation sequence

1. A1, A2: restore validation.
2. B1, B4: give agents accurate docs.
3. E1: extract settings schema without changing behavior.
4. C1-C3: provider registry for adapters/URLs/model fetch.
5. D2-D3: extract pure streaming/error helpers.
6. F1-F3: split tools into testable pieces.
7. C4-C5: finish registry-driven settings/frontmatter.
8. G1-G3: consistency cleanup.
