# Services Layer

All service implementations following single responsibility principle. Services receive dependencies via constructor injection from `ServiceContainer`.

## AI Provider Architecture

### AiProviderService.ts

**Unified AI provider service using adapter pattern.** Replaces the old `BaseAiService` + 6 individual provider services.

Key responsibilities:

- `callAiAPI()` - Main API call method (streaming and non-streaming)
- `inferTitle()` - Generate title from conversation
- `fetchAvailableModels()` - Get models from any provider
- `stopStreaming()` - Abort in-progress streams

Uses Vercel AI SDK (`ai` package) with provider factories:

- `createOpenAI` - OpenAI
- `createAnthropic` - Anthropic
- `createGoogle` - Gemini
- `createOpenRouter` - OpenRouter
- `createOpenAICompatible` - Ollama, LM Studio, Z.AI

AI SDK 7 prompt handling:

- `prepareAiSdkPrompt()` moves plugin `system`/`developer` messages into the top-level `instructions` option
- Only `user` and `assistant` messages are passed through `messages`
- Instructions are preserved for streaming, non-streaming, and tool-result continuation calls

**Provider selection**: Based on model prefix (e.g., `ollama@llama3.2`, `openrouter@anthropic/claude-3-5-sonnet`)

**URL Construction**:

- Base URL + API path suffix (adapter-specific)
- Most providers: `baseURL + /v1`
- OpenRouter: `baseURL + /api/v1`
- Z.AI: `baseURL + /api/paas/v4` or `/api/anthropic/v1` depending on URL mode

### Adapters/ Subdirectory

See `Adapters/CLAUDE.md` for provider-specific adapter documentation.

## Message Processing

### MessageService.ts

**Core message parsing and manipulation**

Key methods:

- `splitMessages(text)` - Split by `<hr class="__chatgpt_plugin">`
- `extractRoleAndMessage(message)` - Parse `role::assistant` format
- `findLinksInMessage(message)` - Find `[[Wiki]]` and `[Markdown](links)`
- `removeYAMLFrontMatter(note)` - Strip YAML section
- `removeCommentsFromMessages(message)` - Filter comment blocks (`%% ... %%`)

### StreamingHandler.ts

**Handles real-time streaming to editor**

- **Line-boundary flushing**: Only flushes up to the last `\n` to prevent cursor offset race conditions during markdown re-rendering
- **Safety valve**: `MAX_BUFFER_SIZE` (10KB) forces flush even without newlines to prevent unbounded buffer growth
- **Periodic flushing**: Uses `DEFAULT_FLUSH_INTERVAL_MS` for timed flushes
- **`forceFlush()`**: Called on stream end to write remaining partial line
- Cursor position management
- Uses utility functions from `StreamingHelpers.ts`

## Editor Operations

### EditorService.ts

**Orchestrates all editor operations**

Main responsibilities:

- `getMessagesFromEditor()` - Extract and parse messages
- `processResponse()` - Insert AI response into editor
- `getFrontmatter()` - Get merged frontmatter + settings
- `createNewChatFromTemplate()` - Template-based chat creation
- `createNewChatWithHighlightedText()` - Chat from selection
- `clearChat()` - Remove messages, keep frontmatter
- `writeInferredTitle()` - Rename file with inferred title

## API Layer

### ApiService.ts

**HTTP request handling**

- `makeNonStreamingRequest()` - Non-streaming POST requests via Obsidian's `requestUrl`
- `makeGetRequest()` - GET requests for model fetching
- `createFetchAdapter()` - Custom fetch for AI SDK (wraps `requestStream`)
- `setAbortController()` / `stopStreaming()` - Stream control
- `wasAborted()` / `resetAbortedFlag()` - Abort state management

### ApiAuthService.ts

**API key management**

`getApiKey(settings, providerType)` - Returns appropriate key based on provider:

- OpenAI → `settings.apiKey`
- OpenRouter → `settings.openrouterApiKey`
- Anthropic → `settings.anthropicApiKey`
- Gemini → `settings.geminiApiKey`
- Z.AI → `settings.zaiApiKey`
- Ollama/LM Studio → "" (no key required)

### requestStream.ts

**Node.js HTTP streaming utility**

- Handles streaming responses on desktop Obsidian using Node.js `http`/`https` modules
- Falls back to native `fetch()` on mobile
- Returns Web API compatible `Response` object
- Used by `ApiService.createFetchAdapter()` to provide fetch-compatible interface for AI SDK

## Configuration

### FrontmatterManager.ts

**YAML frontmatter handling**

- `readFrontmatter(file)` - Parse note frontmatter using Obsidian's metadata cache
- `updateFrontmatterField(file, key, value)` - Update a single field
- Uses `app.metadataCache.getFileCache()` for parsing

Model prefix parsing:

- `ollama@model` → Ollama
- `openrouter@model` → OpenRouter
- `lmstudio@model` → LM Studio
- `zai@model` → Z.AI
- `anthropic@model` → Anthropic
- `gemini@model` → Gemini
- No prefix → OpenAI (default)

### SettingsService.ts

**Plugin settings management** (includes frontmatter operations merged from FrontmatterService)

- `loadSettings()` / `saveSettings()` - Persistence
- `migrateSettings()` - Version upgrades via SettingsMigration.ts
- `getSettings()` - Provide settings to other services
- `getFrontmatter(view)` - Get merged frontmatter config with full priority chain (defaultConfig < defaultFrontmatter < settings < agentFrontmatter < noteFrontmatter)
- `updateFrontmatterField(editor, key, value)` - Update a field in note frontmatter
- `generateFrontmatter()` - Generate frontmatter for new chats using data-driven `PROVIDER_FRONTMATTER_FIELDS` mapping
- `resolveAgentFrontmatter()` - Private method that resolves agent by name from note's `agent` field, merges agent frontmatter and attaches `_agentSystemMessage` from agent body
- `setAgentService()` - Late-binding for AgentService (same pattern as TemplateService)

### SettingsMigration.ts

**Handles settings version upgrades**

- Renames deprecated fields
- Adds new defaults
- Preserves user customizations
- Runs automatically on plugin load

### DefaultConfigs.ts

**Default configuration values for each provider**

- `DEFAULT_OPENAI_CONFIG` - url, model, temperature, max_tokens, top_p, presence_penalty, frequency_penalty
- `DEFAULT_OPENROUTER_CONFIG`
- `DEFAULT_ANTHROPIC_CONFIG`
- `DEFAULT_GEMINI_CONFIG`
- `DEFAULT_OLLAMA_CONFIG`
- `DEFAULT_LMSTUDIO_CONFIG`
- `DEFAULT_ZAI_CONFIG`

## Tool Services (v3.0)

### ToolService.ts

**Orchestrates tool calling with approval workflow**

- `getToolsForRequest()` - Get enabled tool declarations for AI requests (vault_search, file_read, web_search); executor functions are deliberately stripped so AI SDK cannot run tools before approval
- `handleToolCalls()` - Process AI tool call requests, show approval modals, then execute approved tools locally
- `processToolResults()` - Format results for continuation

Coordinates VaultSearchService and WebSearchService with approval modals.

### ToolSupportDetector.ts

**Whitelist-based tool support detection**

- `isModelWhitelisted(model, whitelist)` - Check if model supports tools
- `getDefaultToolWhitelist()` - Returns default whitelist (GPT-4, Claude, Gemini models)

Tool calling is only available for whitelisted models (configurable in settings).

### VaultSearchService.ts

**Vault operations**

- `searchVault(query)` - Full-text search across vault (multi-word OR search)
- `readFiles(paths)` - Read specific files with user approval

### WebSearchService.ts

**Web search via Brave API or custom endpoint**

- `search(query)` - Execute web search
- Supports Brave API or custom provider endpoints
- 1,000 free queries/month on Brave API

### WhitelistValidator.ts

**Model whitelist validation utilities**

## Agent Service (v3.1)

### AgentService.ts

**Agent file CRUD and resolution**

- `getAgentFiles(settings)` - List all `.md` files in the configured agent folder
- `readAgent(file)` - Parse agent file into `AgentData` (frontmatter + body)
- `resolveAgentByName(name, settings)` - Find and parse agent by basename
- `createAgentFile(name, model, temperature, message, settings)` - Create new agent file with frontmatter (model, temperature, stream) and body (system prompt)
- Private helpers: `extractBody()` strips YAML frontmatter, `buildAgentFrontmatter()` generates YAML

**Agent file format**:

```markdown
---
model: gpt-4o
temperature: 0.7
stream: true
---

You are a helpful coding assistant specializing in TypeScript...
```

Dependencies: `App`, `FileService`, `FrontmatterManager`

## Utility Services

### FileService.ts

- Read file contents
- Get files by path or title
- Folder navigation
- `ensureFolderExists()` - Create folder with modal prompt if missing
- `sanitizeFileName()` - Remove invalid characters

### TemplateService.ts

- Load chat templates from configured folder
- Apply to new notes
- Merge frontmatter

### NotificationService.ts

- Show Obsidian notices
- `showError()`, `showWarning()`, `showSuccess()` helpers
- Platform-aware (Notice duration)

### ErrorService.ts

- Process API errors
- Map HTTP codes to messages
- `handleApiError()` - Centralized error handling with context
- User-friendly error display
