# Message Flow

This document describes the current high-level flow from an Obsidian note to an AI response.

## Main chat flow

### 1. User invokes the Chat command

The user runs the ChatGPT MD chat command from a hotkey or the Obsidian command palette.

### 2. `ChatHandler.execute()` runs

Location: `src/Commands/ChatHandler.ts`

The handler:

- gets settings from `SettingsService`,
- asks `EditorService` for merged frontmatter/effective config,
- creates a per-request `AiProviderService` instance via `ServiceContainer.aiProviderService()`,
- registers that instance with `StopStreamingHandler`,
- extracts messages from the editor,
- adds agent/system messages,
- calls the AI provider facade.

### 3. Effective frontmatter config is resolved

Main locations:

- `src/Services/EditorService.ts`
- `src/Services/SettingsService.ts`
- `src/Services/FrontmatterManager.ts`
- `src/Utilities/FrontmatterHelpers.ts`

Config is merged in this priority order:

1. provider defaults
2. default chat frontmatter from global settings
3. global plugin settings
4. referenced agent frontmatter/body
5. note frontmatter

The resolved config includes the model, provider/service, API URL, temperature, token limits, streaming behavior, and any system commands.

### 4. Messages are extracted from the note

Main locations:

- `src/Services/EditorService.ts`
- `src/Services/MessageService.ts`
- `src/Utilities/MessageHelpers.ts`
- `src/Utilities/TextHelpers.ts`

Message extraction handles:

- chat separators,
- role headings such as `role::user` and `role::assistant`,
- YAML frontmatter removal,
- comment block filtering,
- linked-note/context handling where supported.

### 5. System messages are prepended

Location: `src/Commands/ChatHandler.ts`

System message sources include:

- agent body resolved by `SettingsService`,
- `system_commands` from effective frontmatter.

### 6. API key and URL are selected

Main locations:

- `src/Services/ApiAuthService.ts`
- `src/Commands/CommandUtilities.ts`
- `src/Utilities/FrontmatterHelpers.ts`

The API key is selected for the resolved provider. The effective API URL comes from frontmatter/settings/defaults.

### 7. `AiProviderService.callAiAPI()` dispatches the request

Location: `src/Services/AiProviderService.ts`

The provider facade:

- selects the adapter from the model prefix,
- creates/caches the AI SDK provider for the current provider/base URL/API key,
- decides streaming vs non-streaming mode,
- prepares system/user/assistant messages for the selected provider,
- attaches tools when enabled and allowed for the model,
- calls the AI SDK.

Provider-specific behavior comes from `src/Services/Adapters/*Adapter.ts`.

### 8. Streaming or complete response is written to the editor

Main locations:

- `src/Services/AiProviderService.ts`
- `src/Services/StreamingHandler.ts`
- `src/Services/MessageService.ts`
- `src/Services/EditorService.ts`

In streaming mode, chunks are inserted as they arrive. In non-streaming mode, the completed response is inserted once.

The response is formatted using the configured heading level and assistant role marker.

### 9. Optional tool calls run with approval

Main locations:

- `src/Services/ToolService.ts`
- `src/Services/VaultSearchService.ts`
- `src/Services/WebSearchService.ts`
- `src/Views/*ApprovalModal.ts`

When tool calling is enabled and the model is allowed:

1. the model requests a tool call,
2. the user reviews/approves what data may be shared,
3. the tool executes,
4. approved results are returned to the model,
5. the final answer is inserted into the note.

Do not bypass approval flows.

### 10. Optional title inference runs

Main locations:

- `src/Commands/ChatHandler.ts`
- `src/Services/AiProviderService.ts`
- `src/Services/FileService.ts`

If `autoInferTitle` is enabled and the current note title looks like a timestamp, the provider infers a title after enough messages have been exchanged. The file is renamed when inference succeeds.

## Example note format

```markdown
---
model: openai@gpt-4.1-mini
temperature: 0.7
stream: true
---

# role::user

What is the capital of France?

<hr class="__chatgpt_plugin">

# role::assistant [openai@gpt-4.1-mini]

The capital of France is Paris.
```

## Simplified sequence

```text
User command
  -> ChatHandler
  -> EditorService / SettingsService
  -> MessageService
  -> ApiAuthService + URL helpers
  -> AiProviderService
  -> ProviderAdapter + AI SDK
  -> StreamingHandler / MessageService
  -> Editor
```

## Important maintenance notes

- Commands should remain thin orchestrators.
- Provider-specific behavior should stay in adapters where possible.
- Effective config priority is user-visible behavior; add tests before changing it.
- Tool approval is a privacy boundary and must be preserved.
