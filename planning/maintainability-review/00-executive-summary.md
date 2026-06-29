# ChatGPT MD Maintainability Review — Executive Summary

Date: 2026-06-29

Scope: Current Obsidian plugin state with emphasis on DRY, KISS, YAGNI, and ease of implementation by AI agentic workflows and inexperienced open-source contributors.

## Overall assessment

The plugin has useful modular boundaries (`Commands/`, `Services/`, `Views/`, `Utilities/`, `Models/`) and a recent move toward constructor injection via `ServiceContainer`. However, maintainability is currently held back by:

1. **Broken build/test gate** with the current TypeScript/Jest setup.
2. **Documentation drift**: top-level contributor docs still describe removed files/patterns (`ServiceLocator`, `CommandRegistry`, `BaseAiService`, individual provider services).
3. **Large orchestration classes** that mix configuration, provider selection, API calls, streaming, tools, UI side effects, and error handling.
4. **Provider/config duplication** across settings, frontmatter, default configs, provider URL helpers, model fetch logic, and UI schema.
5. **Weak type safety in the riskiest areas** (`any` disabled in ESLint; many provider/tool/response payloads use `any`).
6. **Debug logging and incidental files** that increase noise for users and agents.

## Validation snapshot

Commands run from repository root:

```bash
npm run build
npm test -- --runInBand
npm run lint
```

Results:

- `npm run build`: **fails** before compilation because TS 6-era deprecation errors are emitted for `baseUrl` and `moduleResolution=node10`.
- `npm test -- --runInBand`: **fails** before running tests due to TS config errors (`baseUrl`, `moduleResolution=node10`, and `TS5011` rootDir/common source directory under `ts-jest`).
- `npm run lint`: **passes with 22 warnings**, mainly high complexity and functions over 50 lines.

## Codebase size snapshot

- TypeScript files: 75
- Total TypeScript lines: ~11,985
- Largest files:
  - `src/Services/AiProviderService.ts` — 895 lines
  - `src/Views/ChatGPT_MDSettingsTab.ts` — 650 lines
  - `src/Services/ToolService.ts` — 557 lines
  - `src/Views/CreateAgentModal.ts` — 494 lines
  - `src/Models/Config.ts` — 350 lines

## Highest-priority implementation themes

### P0 — Restore contributor confidence

Make `build`, `test`, and `lint` reliable on a fresh checkout. New contributors and AI workflows need a green baseline before safely refactoring.

### P1 — Stop documentation drift

Replace stale architecture docs with a short, accurate contributor guide. Incorrect docs are worse than no docs for inexperienced contributors and autonomous agents.

### P1 — Create one source of truth for providers

Provider metadata is scattered. Add a central provider registry and derive defaults, settings UI, API URLs, model fetch configuration, and frontmatter provider fields from it.

### P1 — Split giant orchestration classes by responsibility

Do not rewrite the app. Extract narrow pure helpers and small collaborators from `AiProviderService`, `ToolService`, and `ChatGPT_MDSettingsTab` incrementally.

### P2 — Tighten types where they protect behavior

Keep KISS: do not try to type every external response perfectly. Add small local DTOs, type guards, and `unknown` parsing at boundaries.

## Recommended files for implementation agents

Read in this order:

1. `planning/maintainability-review/01-priority-implementation-plan.md`
2. `planning/maintainability-review/02-findings-dry-kiss-yagni.md`
3. `planning/maintainability-review/03-agent-contributor-guidelines.md`
4. `planning/maintainability-review/04-refactor-backlog.md`
5. `planning/maintainability-review/05-current-state-inventory.md`
