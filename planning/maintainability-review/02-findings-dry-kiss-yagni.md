# DRY / KISS / YAGNI Findings

## 1. DRY findings

### 1.1 Provider data is duplicated in too many places

Severity: High

Current repeated concepts:

- provider IDs and labels
- default URLs
- default model/temperature/token config
- settings keys for API keys and URLs
- model fetch behavior
- adapter creation
- frontmatter generation fields
- settings UI fields

Examples:

- `src/Services/DefaultConfigs.ts`
- `src/Models/Config.ts`
- `src/Services/SettingsService.ts`
- `src/Commands/CommandUtilities.ts`
- `src/Views/ChatGPT_MDSettingsTab.ts`
- `src/Services/AiProviderService.ts`

Impact:

- Adding/changing providers requires many coordinated edits.
- AI agents are likely to miss a file and create inconsistent behavior.
- Stale docs have already diverged from implementation.

Recommendation:

- Add one provider registry and derive repeated maps from it.
- Keep backward-compatible setting names.

---

### 1.2 Settings schema is duplicated between types, defaults, UI, migrations, and frontmatter

Severity: High

`ChatGPT_MDSettings` and `DEFAULT_SETTINGS` are long but useful. The problem is that settings are also hand-described in a 400+ line inline schema in `ChatGPT_MDSettingsTab.display()`.

Impact:

- No single place to see all settings metadata.
- Numeric settings use text inputs and are saved as strings unless normalized elsewhere.
- UI changes are risky for new contributors.

Recommendation:

- Move schema to a standalone file.
- Include parse/serialize metadata per setting.
- Derive provider sections from provider registry.

---

### 1.3 Command registration is partly abstracted, partly manual

Severity: Medium

`CommandRegistrar` exists, but `src/main.ts` manually registers chat and model select commands because their command metadata is static. Other handlers implement instance `getCommand()`.

Impact:

- Two patterns for the same thing.
- New contributors must infer which command style to use.

Recommendation:

- Standardize command handlers to a single shape.
- Either make all handlers instance-based or let `CommandRegistrar` accept static metadata plus callback.

---

### 1.4 Notification and error handling are duplicated

Severity: Medium

Direct `new Notice(...)`, `console.error`, and `ErrorService` coexist. `NotificationService` exists but is not used consistently.

Impact:

- Inconsistent user messages.
- Harder to test error behavior.
- More direct Obsidian dependencies in business logic.

Recommendation:

- Prefer `NotificationService` from `ServiceContainer`.
- Keep direct `Notice` usage mostly in UI/view classes.

---

### 1.5 API URL resolution has multiple paths

Severity: Medium

`getAiApiUrls`, `getDefaultApiUrls`, `getApiUrlsFromFrontmatter`, default configs, and adapter `getDefaultBaseUrl()` overlap.

Impact:

- Bugs where one provider URL is updated in one path but not another.

Recommendation:

- Registry owns default URL and setting key.
- One helper resolves effective URL: frontmatter override > settings > provider default.

---

## 2. KISS findings

### 2.1 `AiProviderService` is too large for safe changes

Severity: High

At ~895 lines, the class is a facade, provider factory, request builder, streaming manager, title inference service, tool result handler, and error formatter.

Why this violates KISS:

- A simple provider change requires understanding streaming/tools/title inference.
- Merge conflicts are likely.
- Unit testing requires too much setup.

Keep simple by:

- Keeping `AiProviderService` as a public facade.
- Extracting pure helpers for provider creation, streaming consumption, and error formatting.
- Avoiding a full rewrite.

---

### 2.2 `ToolService` is too broad

Severity: High

`ToolService` registers tools, contains tool definitions, validates availability, coordinates approval modals, formats results, filters results, executes tool calls, and handles provider-specific tool-call normalization.

Keep simple by extracting:

- `defaultToolDefinitions.ts` for tool definitions.
- `ToolApprovalCoordinator` for modal approval flows.
- `ToolResultFormatter` for markdown/result formatting.

Do not create a complex plugin system unless external tools are actually planned.

---

### 2.3 `ChatGPT_MDSettingsTab.display()` does too much

Severity: High

The settings view should render a schema. It currently defines the schema, groups it, orders it, renders provider collapsibles, and handles value coercion.

Keep simple by:

- External schema.
- Small renderer methods.
- Parser per field.

---

### 2.4 Constructor injection is good, but late binding should be minimized

Severity: Medium

`ServiceContainer.create()` uses late binding patterns:

- `EditorService` receives `undefined` for `templateService` during construction.
- `SettingsService.setAgentService()` mutates service after construction.
- `AiProviderService.setSaveSettingsCallback()` is static global state.

Impact:

- Hidden lifecycle rules.
- Harder for agents to reason about service readiness.

Recommendation:

- Prefer small interfaces and explicit dependencies.
- Replace static callback with constructor-injected dependency or event callback passed to methods.
- If circular dependencies remain, document them in `ServiceContainer` with comments and tests.

---

### 2.5 Tests are too few for critical behavior

Severity: Medium

Existing tests focus on utilities and streaming handler, but build/test config currently blocks them. There are no obvious tests around provider URL resolution, provider registry behavior, settings migration, or tool approval formatting.

Keep simple by adding tests for pure helpers after extraction.

---

## 3. YAGNI findings

### 3.1 Avoid rebuilding a full DI framework

The current `ServiceContainer` is understandable. Do not introduce decorators, reflection, or string-based service lookup. The project benefits from explicit construction.

Recommended: keep the container, reduce late binding.

---

### 3.2 Avoid a generic extension/plugin system for tools until needed

Tool code mentions merged `ToolRegistry`/`ToolExecutor`. The current tool set is small. A generic registry is okay internally, but do not build external tool extension APIs unless users request it.

Recommended: extract files for readability, not a framework.

---

### 3.3 Avoid perfect provider abstractions

Providers differ. A registry should centralize metadata, not hide all differences behind excessive abstraction.

Recommended: adapter-specific code remains in adapters; shared metadata goes in registry.

---

### 3.4 Avoid typing every third-party payload exhaustively

Provider APIs evolve quickly. Over-modeling can slow contributors.

Recommended:

- Type stable internal shapes.
- Use `unknown` for external JSON.
- Use small guards where fields are read.

---

### 3.5 Avoid large-scale formatting-only churn

The repo already has Prettier and lint-staged. Do not reformat unrelated files during maintainability refactors. It obscures review and breaks agent resumability.

---

## 4. Contributor friction findings

### 4.1 Stale docs actively mislead contributors

Severity: Critical

Current docs reference non-existent files and old provider architecture. This is especially harmful for inexperienced contributors and AI agents.

Fix before large feature work.

---

### 4.2 Multiple package managers create uncertainty

Severity: Medium

`package-lock.json` and `yarn.lock` both exist. Scripts use `npm` names but some scripts call `yarn` internally.

Recommendation: choose one and document it.

---

### 4.3 Runtime logs are noisy

Severity: Medium

Many unconditional `console.log` statements exist in request/streaming paths. This makes debugging real problems harder.

Recommendation: central logger gated by `debugMode`.

---

### 4.4 ESLint rules identify complexity but do not block it

Severity: Low/Medium

Lint reports 22 warnings. This is useful, but warnings can be ignored indefinitely.

Recommendation:

- Keep warnings for now while refactoring.
- After key files are reduced, enforce `max-lines-per-function` and `complexity` for new code.
