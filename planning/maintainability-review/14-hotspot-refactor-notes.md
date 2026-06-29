# Hotspot Refactor Notes

Date: 2026-06-29

## Summary

Reduced additional lint hotspots and complexity warnings after the final maintainability pass.

## Changes made

- Split `ChatHandler.execute()` title-inference logic into focused helpers.
- Split `AiProviderService.callAiSdkStreamText()` streaming execution/tool-call handling into helpers.
- Simplified `ErrorService.handleApiError()` by extracting user-message classification.
- Moved the large default tool whitelist string to a module constant so the exported function is small.
- Split `VaultSearchService.searchVault()` matching logic into filename/content/query helpers.
- Split `ServiceContainer.create()` into smaller infrastructure/content service factory helpers.

## Validation

```bash
npm run build
npm test -- --runInBand
npm run lint
```

Results:

- `npm run build`: pass
- `npm test -- --runInBand`: pass — 6 suites, 124 tests
- `npm run lint`: pass with 8 warnings remaining

## Remaining warnings

The remaining lint warnings are in deeper hotspots that should be handled with dedicated tests/refactors:

- `ApiService` fetch adapter callback complexity
- `requestStreamNodeHttp()` nested Node HTTP adapter
- `YamlHelpers.parseSettingsFrontmatter()` parser complexity
- `ToolApprovalModal.renderRequestDescription()`
- `WebSearchApprovalModal.renderSelectionItems()`
