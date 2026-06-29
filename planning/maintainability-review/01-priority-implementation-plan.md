# Priority Implementation Plan

This plan is optimized for AI agentic workflows: small batches, explicit acceptance criteria, and low-risk changes first.

## Ground rules for implementation agents

- Keep PRs small. One concern per PR.
- Preserve public behavior unless the task explicitly says otherwise.
- Run validation after every batch:

```bash
npm run build
npm test -- --runInBand
npm run lint
```

- If validation is already failing at task start, document the exact failure before changing files.
- Prefer extracting pure functions over introducing new classes.
- Prefer data-driven tables over copy/paste branches.

---

## P0. Make the project build and test again

### Problem

`npm run build` and `npm test` currently fail before useful feedback:

- `tsconfig.json`: `baseUrl` deprecated in TS 6-era behavior.
- `tsconfig.json`: implicit `moduleResolution=node10` deprecated.
- Jest/ts-jest: `TS5011` common source directory/rootDir issue.

### Target files

- `tsconfig.json`
- `jest.config.js`
- optionally add `tsconfig.test.json`

### Suggested implementation

1. Update `moduleResolution` to a modern value compatible with this project, likely `Bundler` or `NodeNext`. Because package uses ESM and esbuild bundles, prefer testing `Bundler` first.
2. Add `ignoreDeprecations: "6.0"` only if a quick compatibility fix is needed. Prefer removing deprecated settings when possible.
3. Set an explicit `rootDir` for TypeScript/Jest if needed.
4. Consider a dedicated `tsconfig.test.json` for ts-jest to avoid isolated module/rootDir surprises.

### Acceptance criteria

- `npm run build` succeeds.
- `npm test -- --runInBand` runs tests and reports pass/fail test assertions, not TS config startup errors.
- No runtime code changes in this task unless required by compiler errors exposed after config is fixed.

---

## P0. Clean repository noise and package-manager ambiguity

### Problem

The repository contains both `package-lock.json` and `yarn.lock`, committed build artifact `main.js`, `.DS_Store` files, and coverage output. This confuses agents and contributors about what is source of truth.

### Target files

- `.gitignore`
- `package-lock.json` or `yarn.lock` (choose one package manager)
- `main.js` policy
- `coverage/` policy
- `.DS_Store` files

### Suggested implementation

1. Decide package manager from project convention. `package.json` scripts use both `npm` and `yarn`; standardize scripts to `npm` or `yarn`.
2. Keep only one lockfile.
3. Ensure `.DS_Store` and `coverage/` are ignored.
4. Decide whether Obsidian release artifacts (`main.js`) should be tracked. If tracked, document it in `CONTRIBUTING.md`; if not, remove and ignore it.

### Acceptance criteria

- Fresh contributors know which install command to use.
- No OS/generated files appear in `git status` after normal development.

---

## P1. Replace stale architecture documentation

### Problem

`AGENTS.md`, `docs/development.md`, `docs/message-flow.md`, and `docs/CREATE_SERVICE.md` still describe old architecture:

- `src/core/ServiceLocator.ts` no longer exists.
- `src/core/CommandRegistry.ts` no longer exists.
- individual provider service pattern (`OpenAiService`, `AnthropicService`, etc.) is obsolete.
- `BaseAiService` references are stale.
- `FrontmatterService`, `ToolRegistry`, and `ToolExecutor` references are stale/merged.

### Target files

- `AGENTS.md`
- `docs/development.md`
- `docs/message-flow.md`
- `docs/CREATE_SERVICE.md`
- possibly create `CONTRIBUTING.md`

### Suggested implementation

1. Replace old architecture diagrams with current structure:
   - `src/main.ts`
   - `src/core/ServiceContainer.ts`
   - `src/Commands/*Handler.ts`
   - `src/Services/AiProviderService.ts`
   - `src/Services/Adapters/*Adapter.ts`
   - `src/Services/SettingsService.ts` frontmatter responsibilities
   - `src/Services/ToolService.ts`
2. Add a “How to add a provider” guide using the adapter pattern.
3. Add a “How to add a command” guide using `CommandHandler` + `CommandRegistrar`.
4. Add a “How to add a setting” guide, but mark it as temporary until provider registry refactor.

### Acceptance criteria

- No docs refer to non-existent architecture as current truth.
- A new contributor can add a simple provider adapter from docs without reading old deleted files.

---

## P1. Introduce a provider registry as the single source of truth

### Problem

Provider metadata is duplicated across:

- `src/Constants.ts`
- `src/Services/DefaultConfigs.ts`
- `src/Models/Config.ts`
- `src/Services/SettingsService.ts` (`PROVIDER_FRONTMATTER_FIELDS`)
- `src/Commands/CommandUtilities.ts` (`getDefaultApiUrls`, `fetchAvailableModels`)
- `src/Utilities/FrontmatterHelpers.ts`
- `src/Utilities/ProviderHelpers.ts`
- `src/Views/ChatGPT_MDSettingsTab.ts`
- adapter constructors in `AiProviderService`

This violates DRY and makes adding providers error-prone.

### Target files

- create `src/Services/Providers/ProviderRegistry.ts` or `src/Providers/ProviderRegistry.ts`
- update consumers incrementally

### Suggested provider metadata

Keep it simple; do not over-generalize.

```ts
interface ProviderDefinition {
  id: AiServiceType;
  label: string;
  local: boolean;
  requiresApiKey: boolean;
  apiKeySetting?: keyof ApiKeySettings;
  urlSetting: keyof ServiceUrlSettings;
  defaultConfig: ProviderDefaults;
  createAdapter: () => ProviderAdapter;
  settingFields: ProviderSettingField[];
}
```

### Incremental migration order

1. Move adapter map creation out of `AiProviderService` into the registry.
2. Derive `getDefaultApiUrls` from the registry.
3. Derive provider settings UI groups from the registry.
4. Derive `PROVIDER_FRONTMATTER_FIELDS` from the registry.
5. Derive model fetch loops from the registry.

### Acceptance criteria

- Adding a provider requires editing one registry entry plus one adapter file.
- No long provider-specific if/else chains for common metadata.
- Existing settings keys remain backward compatible.

---

## P1. Split `AiProviderService` by responsibility

### Problem

`src/Services/AiProviderService.ts` is 895 lines and handles too many responsibilities:

- provider adapter registry and selection
- AI SDK provider creation/cache
- non-streaming calls
- streaming calls
- stream consumption
- title inference
- tool call formatting
- error formatting/retry classification
- console debug logging

### Suggested implementation

Extract in small PRs:

1. `ProviderFactoryService` or pure `createLanguageModelProvider()` helper.
2. `StreamConsumer` helper for consuming `streamText` output.
3. `AiErrorFormatter` helper for `formatStreamError` and retry detection.
4. `TitleInferenceService` for `inferTitle` flow.
5. Keep `AiProviderService` as the facade used by commands.

### Acceptance criteria

- `AiProviderService.ts` drops below ~400 lines without behavior changes.
- Extracted helpers are unit-testable without Obsidian.
- Public interface `IAiApiService` stays stable unless a separate task updates all callers.

---

## P1. Make settings UI data-driven and smaller

### Problem

`src/Views/ChatGPT_MDSettingsTab.ts` has a 448-line `display()` method and embeds the full settings schema inline.

### Suggested implementation

1. Move `settingsSchema` to `src/Views/settingsSchema.ts` or derive most provider fields from the provider registry.
2. Keep rendering functions in `ChatGPT_MDSettingsTab`.
3. Add field parser metadata for numbers so numeric settings are saved as numbers, not strings.

### Acceptance criteria

- `display()` is mostly orchestration: group schema, render groups.
- Schema entries are easy to review in a standalone file.
- Numeric fields preserve numeric types in saved settings.

---

## P2. Improve boundary typing without boiling the ocean

### Problem

ESLint disables `no-explicit-any`, and many core boundaries use `any`:

- provider response parsing
- tool calls/results
- frontmatter records
- API service payloads
- stop streaming handler

### Suggested implementation

1. Replace `any` with `unknown` at external boundaries.
2. Add tiny type guards near use sites.
3. Keep provider-specific raw response types minimal.
4. Re-enable `@typescript-eslint/no-explicit-any` as warning first.

### Acceptance criteria

- No broad type rewrites.
- Tool calls and provider response parsing fail safely on malformed data.
- Lint surfaces new `any` uses as warnings.

---

## P2. Gate console logging behind debug mode

### Problem

There are many unconditional `console.log` statements in runtime code, especially AI/API/streaming paths. Settings already include `debugMode`, but many logs ignore it.

### Suggested implementation

1. Add a tiny `Logger` utility with `debug/info/warn/error`.
2. Pass debug flag through services or set logger context from settings.
3. Replace unconditional `console.log` in runtime paths.
4. Keep `console.error` for unexpected errors, but ensure secrets are redacted.

### Acceptance criteria

- Normal plugin usage does not spam console.
- Debug mode produces useful logs.
- API keys are never logged.
