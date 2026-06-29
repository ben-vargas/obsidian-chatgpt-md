# Tool Definitions

This folder contains AI SDK tool definitions. Tool orchestration, approval, filtering, and result formatting live mostly in `src/Services/ToolService.ts`.

## Files

### `defaultTools.ts`

Defines the built-in tools returned by `createDefaultTools(context)`:

- `vault_search` - searches the Obsidian vault via `VaultSearchService.searchVault()`
- `file_read` - reads selected vault files via `VaultSearchService.readFiles()`
- `web_search` - searches the web via `WebSearchService.searchWeb()`

Tools are created with Vercel AI SDK `tool()` and zod schemas via `zodSchema()`.

## Security and privacy rules

Tools can expose vault content and web results to an LLM. Preserve the human approval model.

- Never bypass `ToolService.handleToolCalls()` approval flow.
- Never send raw vault search/read/web results back to the model without the existing approval/filtering path.
- Keep tool outputs deterministic and easy to review.
- Do not log vault contents, full prompts, file contents, web-search API keys, or user secrets.
- Avoid broadening tool schemas in a way that grants more access than the UI approval describes.
- Prefer explicit, narrow inputs over generic command execution or arbitrary file access.

## Adding a tool

1. Add the tool definition in `defaultTools.ts` or another focused file in this folder.
2. Register it through `createDefaultTools()` / `ToolService`.
3. Add approval handling in `ToolService` and the relevant approval modal in `src/Views/` if needed.
4. Add deterministic result formatting/filtering in `ToolService.processToolResults()`.
5. Update model whitelist docs/settings if the tool requires tool-calling support.
6. Add tests for pure formatting/filtering helpers where practical.

## Tool result flow

1. `AiProviderService` includes tools only when plugin settings enable tool calling and model whitelist allows it.
2. AI SDK returns tool calls.
3. `ToolService.handleToolCalls()` asks the user to approve execution.
4. Tool-specific services execute the approved request.
5. User reviews/selects results when required.
6. `ToolService.processToolResults()` formats selected context messages for the continuation request.
7. `AiProviderService` continues generation with the tool context.

## Related files

- `src/Services/ToolService.ts` - orchestration, approval, result processing
- `src/Services/VaultSearchService.ts` - vault search/read implementation
- `src/Services/WebSearchService.ts` - web search implementation
- `src/Services/ToolSupportDetector.ts` - model whitelist matching
- `src/Views/ToolApprovalModal.ts` - initial tool execution approval
- `src/Views/SearchResultsApprovalModal.ts` - vault result review
- `src/Views/WebSearchApprovalModal.ts` - web result review
- `src/Models/Tool.ts` - registered tool and handler types

## Validation

For tool-related changes, run:

```bash
npm run build
npm test -- --runInBand
```

Manual Obsidian validation is important: enable tool calling, trigger each affected tool, and confirm both approval layers still appear.
