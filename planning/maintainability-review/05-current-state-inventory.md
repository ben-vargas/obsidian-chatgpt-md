# Current State Inventory

This document records observed facts from the repository at review time.

## Repository/tooling

### Package metadata

- Package name/version: `chatgpt-md@3.1.0`
- Module type: ESM (`"type": "module"`)
- Build: `tsc -noEmit -skipLibCheck && node esbuild.config.mjs production`
- Test: Jest + ts-jest with ESM
- Lint: ESLint flat config

### Dependency notes

Runtime dependencies are mainly AI SDK providers and `zod`:

- `ai`
- `@ai-sdk/openai`
- `@ai-sdk/openai-compatible`
- `@ai-sdk/anthropic`
- `@ai-sdk/google`
- `@openrouter/ai-sdk-provider`
- `zod`

This is reasonable for current functionality. Avoid adding new dependencies for simple helpers.

### Lockfile/package-manager state

Both `package-lock.json` and `yarn.lock` exist. `package.json` scripts include npm-style commands but also scripts that run `yarn build`.

Recommended: standardize before major contributor onboarding.

## Validation results

### `npm run build`

Failed with TypeScript config deprecation errors:

```text
tsconfig.json(3,5): error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
tsconfig.json(10,25): error TS5107: Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0.
```

### `npm test -- --runInBand`

Failed before running tests. All test suites failed due to TS config startup issues, including:

```text
TS5011: The common source directory of 'tsconfig.json' is './src/Utilities'. The 'rootDir' setting must be explicitly set...
TS5101: Option 'baseUrl' is deprecated...
TS5107: Option 'moduleResolution=node10' is deprecated...
```

### `npm run lint`

Passed with 22 warnings. Main warning clusters:

- `ChatGPT_MDSettingsTab.display()` too long (448 lines)
- `AiProviderService.callAiSdkStreamText()` too long
- `AiProviderService.formatStreamError()` too complex
- `ErrorService.handleApiError()` too long and complexity 30
- `ToolService.registerDefaultTools()` too long
- `ToolSupportDetector.getDefaultToolWhitelist()` too long
- `requestStream` functions too long
- `YamlHelpers.parseSettingsFrontmatter()` too long/complex

## Source size hotspots

Largest TypeScript files by line count:

```text
895 src/Services/AiProviderService.ts
650 src/Views/ChatGPT_MDSettingsTab.ts
557 src/Services/ToolService.ts
494 src/Views/CreateAgentModal.ts
350 src/Models/Config.ts
308 src/Views/ToolApprovalModal.ts
302 src/Services/SettingsService.ts
266 src/Services/SettingsMigration.ts
246 src/Services/ToolSupportDetector.ts
237 src/Services/requestStream.ts
231 src/Services/MessageService.ts
225 src/Services/ApiService.ts
211 src/Views/BaseApprovalModal.ts
204 src/Utilities/InputValidator.ts
193 src/Services/FrontmatterManager.ts
179 src/core/ServiceContainer.ts
168 src/Commands/CommandUtilities.ts
166 src/Services/VaultSearchService.ts
165 src/Services/ErrorService.ts
164 src/Services/WhitelistValidator.ts
164 src/Commands/ChatHandler.ts
```

## Documentation drift findings

Search found current docs still referencing old architecture:

- `AGENTS.md`
  - `src/core/ServiceLocator.ts`
  - `src/core/CommandRegistry.ts`
  - individual provider services like `OpenAiService`
  - `FrontmatterService`
  - `ToolRegistry` / `ToolExecutor`
- `docs/development.md`
  - old tree and `BaseAiService` extension flow
- `docs/message-flow.md`
  - old `CommandRegistry` and `ServiceLocator` flow
- `docs/CREATE_SERVICE.md`
  - old service-per-provider pattern

Current implementation uses:

- `src/core/ServiceContainer.ts`
- `src/Commands/*Handler.ts`
- `src/Services/AiProviderService.ts`
- `src/Services/Adapters/*Adapter.ts`

## Runtime logging findings

There are many unconditional logs in runtime source. Notable files:

- `src/Services/AiProviderService.ts`
- `src/Services/ApiService.ts`
- `src/Services/requestStream.ts`
- `src/Services/SettingsMigration.ts`
- `src/Services/WebSearchService.ts`
- `src/Utilities/ModalHelpers.ts`

The settings model has `debugMode`, but many logs are not gated by it.

## Type-safety findings

ESLint disables several safety rules:

```js
"@typescript-eslint/no-explicit-any": "off",
"@typescript-eslint/no-unsafe-assignment": "off",
"@typescript-eslint/no-unsafe-member-access": "off",
"@typescript-eslint/no-unsafe-call": "off",
"@typescript-eslint/no-floating-promises": "off",
"@typescript-eslint/no-misused-promises": "off",
"@typescript-eslint/await-thenable": "off"
```

Frequent `any` appears in high-risk integration boundaries:

- API payloads/responses
- provider response parsing
- tool calls/results
- frontmatter records
- stream result handling
- Obsidian view compatibility

Recommendation: do not turn all rules to error immediately. Start with `no-explicit-any` as warning and fix touched files.

## Architecture strengths

- Clear high-level folders.
- `ServiceContainer` is explicit and easier to understand than hidden service lookup.
- Provider adapters are a good direction.
- Tool approval UX appears privacy-conscious.
- Some pure utilities already have tests.
- Lint complexity rules exist and identify real hotspots.

## Architecture risks

### Service construction has hidden lifecycle details

`ServiceContainer.create()` has late binding and static callback patterns:

- `EditorService` is created before `TemplateService` and receives `undefined` for it.
- `SettingsService` receives `AgentService` via `setAgentService()` after construction.
- `AiProviderService.setSaveSettingsCallback()` stores static global state.

This is workable but should be documented or simplified.

### Settings and frontmatter responsibilities are mixed

`SettingsService` persists plugin settings and also resolves effective per-note frontmatter. This may be okay short-term, but it makes the service harder to reason about.

If extracting, prefer a small `EffectiveConfigResolver` pure-ish helper over recreating an old large `FrontmatterService`.

### API service and AI provider service overlap

`ApiService` still has low-level fetch/requestStream behavior while `AiProviderService` now uses AI SDK for major flows. Confirm which paths are still active before deleting anything.

### Generated/compiled artifacts may confuse agents

`main.js` is present at repo root. Agents should not use it as source truth.

## Suggested review questions before implementation

1. Is `main.js` intended to be committed for Obsidian plugin release compatibility?
2. Should npm or yarn be the official package manager?
3. Is TypeScript 6 behavior intentional due to current local Node/npm resolution, or should dependency versions be pinned differently?
4. Should `SettingsService` keep frontmatter merge logic, or should a small resolver be extracted?
5. Which direct API paths are still required now that AI SDK is used?
