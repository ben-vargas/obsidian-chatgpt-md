# Development Guide

## Prerequisites

- Node.js 22 or newer (AI SDK 7 requirement); Node.js 24 LTS is used in CI
- Yarn 1.x

AI SDK 7 packages are ESM-only. Source code and build scripts use ESM imports, while esbuild bundles dependencies into the CommonJS `main.js` format required by Obsidian.

## Build and Development Commands

```bash
# Development/watch build
yarn dev

# Production build with type checking
yarn build

# Tests
yarn test --runInBand
yarn test:watch
yarn test:coverage

# Linting
yarn lint
yarn lint:fix

# Bundle analysis
yarn build:analyze
yarn analyze
yarn build:size
yarn build:full-analysis
```

Use Yarn for validation unless package-manager policy changes.

## Build process

The plugin is bundled with esbuild.

- Entry point: `src/main.ts`
- Output: `main.js`
- Obsidian/Electron/CodeMirror modules are externalized.
- Production builds type-check with `tsc -noEmit -skipLibCheck`, then bundle with esbuild.
- Development builds run esbuild in watch mode.

`main.js` is generated. Do not edit it by hand.

## Current project structure

```text
src/
├── main.ts                         # Plugin entry point
├── Constants.ts                    # Shared constants and command IDs
├── core/
│   └── ServiceContainer.ts         # Explicit dependency wiring
├── Commands/
│   ├── CommandHandler.ts           # Command interfaces
│   ├── CommandRegistrar.ts         # Registration helpers
│   └── *Handler.ts                 # Command implementations
├── Services/
│   ├── AiProviderService.ts        # Unified AI request facade
│   ├── Adapters/                   # Provider-specific adapters
│   ├── SettingsService.ts          # Settings + effective frontmatter config
│   ├── ToolService.ts              # Tool registration/approval/execution
│   └── *.ts                        # Editor, file, message, API, template services
├── Views/                          # Obsidian settings tab and modals
├── Models/                         # Internal data models
├── Types/                          # Cross-service type contracts
├── Utilities/                      # Stateless helpers
└── __mocks__/                      # Jest mocks
```

## Architecture overview

### ServiceContainer

`src/core/ServiceContainer.ts` is the only place where services are wired together. It uses explicit constructor injection and exposes service instances as readonly properties.

Do not add a string-based service locator or decorator-based DI framework.

### Command handlers

Commands live in `src/Commands/`. They should:

- read the editor/view/settings state they need,
- call services,
- show high-level status/notifications,
- avoid embedding provider/tool business logic.

Use `CommandRegistrar` where possible.

### Provider adapters

AI providers are represented by adapters in `src/Services/Adapters/` and orchestrated by `AiProviderService`.

Adapters own provider-specific behavior such as:

- auth headers,
- model list parsing,
- default base URL,
- system-message role,
- API path suffix,
- tool support flags.

### Settings/frontmatter

`SettingsService` loads plugin settings, runs migrations, and resolves effective per-note config. Preserve merge priority:

1. provider defaults
2. default chat frontmatter
3. global settings
4. agent frontmatter/body
5. note frontmatter

## Common tasks

### Add a command

1. Create a handler in `src/Commands/`.
2. Implement `EditorCommandHandler`, `EditorViewCommandHandler`, or `CallbackCommandHandler` from `CommandHandler.ts`.
3. Register the handler in `src/main.ts`.
4. Add/update tests for extracted pure logic when possible.

### Add provider behavior

See `docs/CREATE_SERVICE.md`. Despite the historical filename, provider support now uses adapters rather than one service class per provider.

### Add a setting

1. Update `ChatGPT_MDSettings` in `src/Models/Config.ts`.
2. Update `DEFAULT_SETTINGS`.
3. Update `ChatGPT_MDSettingsTab` UI schema/rendering.
4. Add migration logic if existing user data needs conversion.
5. Document the setting if user-facing.

### Test locally in Obsidian

1. Build:

   ```bash
   yarn build
   ```

2. Reload Obsidian or copy the plugin folder into a test vault's `.obsidian/plugins/chatgpt-md/` folder.
3. Open Obsidian developer tools and check the console.

## Code style

- TypeScript only for source changes.
- Prefer `async`/`await`.
- Prefer small pure helpers for refactors.
- Avoid `any` in new code; use `unknown` plus small type guards at external boundaries.
- Do not add new dependencies unless the benefit is clear and documented.

## Refactoring guidance

Known maintainability targets are documented in `planning/maintainability-review/`.

Important near-term targets:

- central provider registry,
- smaller `AiProviderService`,
- smaller/data-driven settings UI,
- smaller `ToolService`,
- debug-gated logging.
