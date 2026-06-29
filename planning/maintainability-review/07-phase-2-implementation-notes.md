# Phase 2 Implementation Notes

Date: 2026-06-29

## Summary

Implemented the documentation/contributor-guidance phase. The goal was to remove stale architectural guidance that referenced deleted files and old provider patterns, then replace it with concise current instructions for contributors and AI agents.

## Changes made

### `AGENTS.md`

- Replaced stale `ServiceLocator` / `CommandRegistry` architecture with the current `ServiceContainer` + command-handler architecture.
- Documented current provider adapter flow.
- Added implementation rules for DRY/KISS/YAGNI.
- Added guidance for commands, providers, settings/frontmatter, tools, logging, and generated files.

### `CONTRIBUTING.md`

- Added a new short contributor guide.
- Documented setup and validation commands.
- Added project map, PR guidelines, command/provider/settings guidance, security/privacy notes, and generated-file policy.

### `docs/development.md`

- Rewrote the development guide around current source structure and npm validation commands.
- Replaced old service-per-provider examples with the current provider-adapter architecture.
- Added common task instructions for commands, provider behavior, settings, and local Obsidian testing.

### `docs/CREATE_SERVICE.md`

- Rewrote the historical provider guide to explain the current adapter-based provider architecture.
- Kept the filename for compatibility with existing links, but clearly marked the historical naming.
- Added a practical provider checklist for the current non-registry state.

### `docs/message-flow.md`

- Rewrote message flow to reflect the current `ChatHandler` → `EditorService`/`SettingsService` → `AiProviderService` → adapter/AI SDK flow.
- Documented effective config merge priority and tool approval boundaries.

## Validation

```bash
npm run build
npm test -- --runInBand
npm run lint
```

Results:

- `npm run build`: pass
- `npm test -- --runInBand`: pass — 4 suites, 117 tests
- `npm run lint`: pass with existing 22 complexity/length warnings

## Follow-ups

- Some source comments and `src/**/CLAUDE.md` files intentionally still mention old names as historical migration notes. They are not user-facing architecture docs, but can be cleaned in a later documentation polish pass.
- Next implementation phase should start the provider registry or settings-schema extraction.
