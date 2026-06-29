# Phase 6 Implementation Notes

Date: 2026-06-29

## Summary

Started the settings UI simplification by extracting the inline settings schema out of `ChatGPT_MDSettingsTab`.

## Changes made

### `src/Views/settingsSchema.ts`

- Added a standalone settings schema module.
- Moved `SettingDefinition` and `COLLAPSIBLE_GROUPS` out of the settings tab class.
- Moved the large settings metadata array into `SETTINGS_SCHEMA`.
- Added `createSettingsSchema(settings)` for the one dynamic placeholder currently needed by `defaultChatFrontmatter`.

### `src/Views/ChatGPT_MDSettingsTab.ts`

- Removed provider/default config imports that were only needed to build the inline schema.
- Replaced the 400+ line inline schema with `createSettingsSchema(this.settingsProvider.settings)`.
- Preserved rendering behavior and setting IDs.

## Validation

```bash
npm run build
npm test -- --runInBand
npm run lint
```

Results:

- `npm run build`: pass
- `npm test -- --runInBand`: pass — 5 suites, 121 tests
- `npm run lint`: pass with 19 existing complexity/length warnings

## Follow-ups

- Split `ChatGPT_MDSettingsTab.display()` further so it falls below the 50-line lint threshold.
- Add parser/coercer metadata to the schema so numeric text fields save numbers instead of strings.
- Later, derive provider-specific settings groups from the provider registry.
