# Tool Whitelist Scripts

Manual maintenance workflow for determining which models support AI tool calling.

## Purpose

The plugin only enables tools for whitelisted models. This folder helps maintain `src/Services/ToolSupportDetector.ts:getDefaultToolWhitelist()` by:

1. Fetching available provider models.
2. Testing tool-calling behavior with real API calls.
3. Generating a suggested whitelist for human review.

These scripts are intentionally manual. They should not silently update source code.

## Key files

### Source scripts

- `fetch-available-models.mjs` - queries configured providers and writes `available-models.json`
- `test-models-tools.mjs` - tests model tool-calling support and writes `tool-test-results.json`
- `generate-whitelist.mjs` - reads test results and writes `generated-whitelist.txt`
- `validate-tool-whitelist.mjs` - validates whitelist formatting/coverage
- Other `test-*.mjs` files are focused experiments/legacy helpers; inspect before use.

### Generated/derived files

- `available-models.json` - provider model discovery output
- `tool-test-results.json` - tool support test output
- `generated-whitelist.txt` - suggested whitelist output

Commit generated files only when intentionally refreshing whitelist artifacts. Do not commit transient, partial, or personally scoped test output.

### Documentation

- `README-WHITELIST-MAINTENANCE.md` - primary maintenance workflow
- `TOOL_SUPPORT_TESTING.md` - testing details
- `QUICK-START.md` - quick command reference

## API key and cost safety

- Scripts may use API keys from plugin `data.json` or environment/configured settings.
- Real model tests can cost money and may trigger provider rate limits.
- Start with `--limit` and/or `--provider` before full test runs.
- Never log API keys.
- Avoid committing files that expose account-specific model availability if that is not intended.

## Standard workflow

```bash
# 1. Fetch provider model lists
node scripts/tool-whitelist/fetch-available-models.mjs

# 2. Run a small/cheap tool-support sample first
node scripts/tool-whitelist/test-models-tools.mjs --limit 5

# 3. Generate suggested whitelist
node scripts/tool-whitelist/generate-whitelist.mjs

# 4. Human review, then manually update src/Services/ToolSupportDetector.ts
```

Provider-specific test example:

```bash
node scripts/tool-whitelist/test-models-tools.mjs --provider openai --limit 10
```

## Updating the default whitelist

1. Review generated results and provider errors.
2. Update `src/Services/ToolSupportDetector.ts:getDefaultToolWhitelist()` manually.
3. Update `docs/tool-whitelist.md` if user-facing guidance changes.
4. Run validation:

```bash
npm run build
npm test -- --runInBand
```

5. Manually test at least one tool-enabled model in Obsidian when practical.

## Important rules

- Do not automatically trust `/v1/models` availability as proof that a model supports every endpoint or tools.
- Keep generated whitelist entries broad enough to be maintainable but narrow enough to avoid enabling unsupported models.
- Treat OpenRouter model IDs separately from native provider IDs (`openrouter@openai/...` vs `openai@...`).
- Preserve human approval semantics; whitelist changes only decide whether tool definitions are sent to the model.
