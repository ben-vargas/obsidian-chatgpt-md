# Guidelines for Future AI Agents and New Contributors

This file is intended to make the project easier to modify safely.

## Current architecture map

Use this as the source of truth until main docs are updated.

- `src/main.ts`
  - Plugin entry point.
  - Creates `ServiceContainer`.
  - Loads/migrates settings.
  - Registers command handlers.

- `src/core/ServiceContainer.ts`
  - Explicit constructor-injection container.
  - Creates long-lived services and an `AiProviderService` factory.
  - Avoid adding string-based service lookup.

- `src/Commands/*Handler.ts`
  - One command per handler or small related command group.
  - Commands should orchestrate services, not implement provider/tool logic.

- `src/Services/AiProviderService.ts`
  - Current facade for AI calls, streaming, title inference, and provider selection.
  - Large and should be refactored incrementally.

- `src/Services/Adapters/*Adapter.ts`
  - Provider-specific model listing/auth/system-role behavior.
  - Add provider-specific API differences here, not in command handlers.

- `src/Services/SettingsService.ts`
  - Loads/saves plugin settings.
  - Runs migrations.
  - Currently also resolves merged frontmatter.

- `src/Services/ToolService.ts`
  - Registers and executes AI tools.
  - Coordinates approval and result formatting.
  - Large and should be split by responsibility.

- `src/Views/*Modal.ts` and `src/Views/ChatGPT_MDSettingsTab.ts`
  - Obsidian UI classes.
  - Keep business logic out where practical.

- `src/Utilities/*Helpers.ts`
  - Stateless helpers. Prefer adding pure logic here when no service state is needed.

## Before you edit

1. Run:

```bash
git status --short
npm run build
npm test -- --runInBand
npm run lint
```

2. If build/test fail at baseline, record the failures in your implementation notes.
3. Read the smallest relevant files. Do not scan the generated `main.js` for source truth.
4. Search before creating new helpers:

```bash
rg "functionName|settingName|providerName" src docs AGENTS.md
```

## Change-size rules

Good PR/task sizes:

- Fix one build/test config issue.
- Extract one helper from a large class.
- Move one schema to a separate file.
- Add one provider adapter with tests.

Bad PR/task sizes:

- Rewriting all provider handling at once.
- Formatting the entire repo plus logic changes.
- Updating docs and refactoring runtime code in the same commit unless docs are for that refactor.

## How to add a command

1. Create or update a handler in `src/Commands/`.
2. Implement one of the command handler interfaces in `src/Commands/CommandHandler.ts`.
3. Register via `CommandRegistrar` in `src/main.ts`.
4. Keep command handlers as orchestrators:
   - read editor/frontmatter
   - call services
   - show high-level status
   - delegate actual work to services/helpers

## How to add provider behavior today

Until the provider registry exists:

1. Add/update adapter in `src/Services/Adapters/`.
2. Update adapter map in `src/Services/AiProviderService.ts`.
3. Update defaults in `src/Services/DefaultConfigs.ts`.
4. Update settings type/defaults in `src/Models/Config.ts`.
5. Update API URL/model helpers in utilities/commands as needed.
6. Update settings UI in `src/Views/ChatGPT_MDSettingsTab.ts`.
7. Update docs.

After the provider registry is implemented, this should become:

1. Add adapter.
2. Add one registry entry.
3. Add tests.

## How to work with settings safely

- Keep setting names backward compatible unless a migration is included.
- If adding a setting:
  - update `ChatGPT_MDSettings`
  - update `DEFAULT_SETTINGS`
  - update UI schema
  - update migration if old user data needs conversion
  - add a short docs note
- Normalize numeric inputs. Text fields currently provide strings.

## How to work with frontmatter safely

- Effective config is merged from defaults, default chat frontmatter, global settings, agent frontmatter, and note frontmatter.
- Preserve priority order unless explicitly changing behavior.
- Add tests around merge behavior before refactoring.

## How to work with tools safely

- Tool calls can expose user vault/web data. Preserve human approval flows.
- Do not bypass modals or approval filtering.
- Keep tool result formatting deterministic and testable.
- Do not add external network tools without explicit settings and approval UX.

## Logging rules

- Do not log API keys or full request payloads containing user content by default.
- Use debug logging for streaming/request internals.
- Prefer a centralized logger once implemented.

## TypeScript rules

- Prefer `unknown` over `any` at external boundaries.
- Add small type guards near where fields are accessed.
- Do not create huge third-party API response type hierarchies.
- Keep internal DTOs small and stable.

## Recommended acceptance note format

For every implementation task, leave a short note:

```md
## Summary
- Changed X
- Preserved Y

## Validation
- npm run build: pass/fail + notes
- npm test -- --runInBand: pass/fail + notes
- npm run lint: pass/fail + notes

## Follow-ups
- Any deferred cleanup
```

## Files to avoid editing casually

- `main.js`: generated bundle/release artifact. Do not edit by hand.
- lockfiles: edit only when changing dependencies or package manager policy.
- coverage output: generated, should not be manually edited.
