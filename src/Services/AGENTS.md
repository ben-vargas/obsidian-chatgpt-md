# Services guide

Authoritative architecture and implementation rules are in `/AGENTS.md`, `/CONTRIBUTING.md`, and `/docs/development.md`.

## Request path

`ChatHandler` resolves settings/messages and calls `AiProviderService`. The facade delegates provider selection/cache to `ProviderRuntime`, request-option normalization to `AiRequestOptions`, and stream iteration to `StreamConsumer`. Provider protocol differences remain in `Adapters/`; operational metadata remains in `Providers/ProviderRegistry.ts`. Network transport goes through `requestStream.ts`: Node http/https via guarded `window.require` on desktop, `window.fetch` on mobile — keep it free of static Node imports.

## Settings/frontmatter

`SettingsService` loads once, applies idempotent migrations, resolves agents, and preserves this priority:

1. provider defaults
2. default chat frontmatter
3. global/provider settings
4. agent frontmatter/body
5. note frontmatter

Production YAML parsing uses Obsidian's parser. Persisted keys and model prefixes are compatibility contracts.

## Tools and privacy

`ToolService` registers fixed internal definitions, exposes declarations without executors, validates arguments, requests approvals sequentially, executes approved calls, and creates continuation context. `Tools/ToolApprovalCoordinator.ts` owns modal interaction; `Tools/ToolResultFormatter.ts` owns pure formatting.

Never bypass execution approval or vault/web result selection. Never include unselected content in model context.

## Dependency wiring

`core/ServiceContainer.ts` is the sole composition root. Constructors do not start unobserved async work. Do not add hidden fallback services, late setters, static callbacks, a service locator, or a DI framework.

## Errors and logging

Use `Logger` rather than direct console calls. Logs must not contain credentials, prompts, vault content, or tool results. Commands/views own user-facing notices; services should return or throw useful errors.

## Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
```
