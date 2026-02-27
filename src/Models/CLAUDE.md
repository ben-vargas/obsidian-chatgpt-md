# Configuration Models & Types

TypeScript interfaces for settings and configuration.

## Config.ts

**Main settings interface**

### ChatGPT_MDSettings

Extends multiple interfaces:

- ApiKeySettings
- FolderSettings
- ChatBehaviorSettings
- FormattingSettings
- TemplateSettings
- ServiceUrlSettings
- WebSearchSettings
- OpenAIFrontmatterSettings
- OpenRouterFrontmatterSettings
- OllamaFrontmatterSettings
- LmStudioFrontmatterSettings
- AnthropicFrontmatterSettings
- GeminiFrontmatterSettings
- ZaiFrontmatterSettings

### Key Setting Groups

**API Keys**:

```typescript
apiKey: string; // OpenAI
openrouterApiKey: string; // OpenRouter
anthropicApiKey: string; // Anthropic
geminiApiKey: string; // Gemini
zaiApiKey: string; // Z.AI
```

**Folders**:

```typescript
chatFolder: string; // Path for chat files
chatTemplateFolder: string; // Path for templates
agentFolder: string; // Path for agent files
```

**Chat Behavior**:

```typescript
stream: boolean; // Stream responses
generateAtCursor: boolean; // Insert at cursor vs end
autoInferTitle: boolean; // Auto title after 4 messages
enableToolCalling: boolean; // Master switch for tools
toolEnabledModels: string; // Whitelist of models (supports wildcards)
debugMode: boolean; // Enable debug logging
pluginSystemMessage: string; // Context for LLMs
```

**Web Search**:

```typescript
webSearchProvider: "brave" | "custom"; // Search provider
webSearchApiKey: string; // API key for search
webSearchApiUrl: string; // Custom endpoint URL
maxWebSearchResults: number; // Results to return (1-10)
```

**Service URLs**:

```typescript
openaiUrl: string;
openrouterUrl: string;
ollamaUrl: string;
lmstudioUrl: string;
anthropicUrl: string;
geminiUrl: string;
zaiUrl: string;
```

### Frontmatter Override

All settings can be overridden per-note:

```yaml
---
model: ollama@llama3.2
temperature: 0.7
max_tokens: 2000
stream: true
system_commands: ["You are a helpful assistant."]
agent: CodingExpert
---
```

**Merge priority**: defaultConfig < defaultFrontmatter < settings < agentFrontmatter < noteFrontmatter

Agent frontmatter is resolved when note contains `agent: AgentName` field. The agent body becomes `_agentSystemMessage` which is prepended as a system message.

### MergedFrontmatterConfig

Runtime configuration after merging all sources:

```typescript
interface MergedFrontmatterConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  stream: boolean;
  aiService: string; // Runtime: determined from model/url/keys
  url: string; // Runtime: service URL
  system_commands?: string[] | null;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  _agentSystemMessage?: string; // Runtime: agent body
  [key: string]: unknown;
}
```

### DEFAULT_SETTINGS

Default values for all settings, loaded from:

- Constants: `DEFAULT_DATE_FORMAT`, `DEFAULT_HEADING_LEVEL`, `PLUGIN_SYSTEM_MESSAGE`
- DefaultConfigs: Provider-specific defaults (model, temperature, etc.)

## Message.ts

**Message interface for chat messages**:

```typescript
interface Message {
  role: string; // "user", "assistant", "system", "developer"
  content: string; // Message text
}
```

## Tool.ts

**Tool definitions for AI function calling**

Describes executable tools:

- `vault_search` - Search vault notes
- `file_read` - Read specific files
- `web_search` - Web search via Brave API

## Constants.ts (in src/)

Key constants used across the codebase:

**Provider Types**:

```typescript
type AiServiceType = "openai" | "ollama" | "openrouter" | "lmstudio" | "anthropic" | "gemini" | "zai";
```

**Message Format**:

- `ROLE_IDENTIFIER = "role::"` - Role prefix in editor
- `HORIZONTAL_LINE_MD = '<hr class="__chatgpt_plugin">'` - Message separator
- `COMMENT_BLOCK_START` / `COMMENT_BLOCK_END` - Comment markers

**Link Detection**:

- `WIKI_LINKS_REGEX` - Matches `[[Title]]`
- `MARKDOWN_LINKS_REGEX` - Matches `[Text](path)`

**Agent Constants**:

- `AGENT_FOLDER_TYPE` - Folder type identifier for agent folder
- `CHOOSE_AGENT_COMMAND_ID` / `CREATE_AGENT_COMMAND_ID` - Command IDs for agent handlers
- `AGENT_WIZARD_SYSTEM_PROMPT` - System prompt used by AI Wizard to generate agent configurations (name, temperature, prompt as JSON)

**Error Messages**:

- `CHAT_ERROR_MESSAGE_401` - Authorization error
- `CHAT_ERROR_MESSAGE_404` - Not found error
- `CHAT_ERROR_MESSAGE_NO_CONNECTION` - Network error
- `TRUNCATION_ERROR_FULL` / `TRUNCATION_ERROR_PARTIAL` - Token limit warnings

**Timing**:

- `FETCH_MODELS_TIMEOUT_MS = 6000` - Model fetch timeout
- `NOTICE_DURATION_SHORT_MS = 6000` - Short notification
- `NOTICE_DURATION_LONG_MS = 9000` - Long notification

## Types/ Directory

See `src/Types/CLAUDE.md` for AI service interfaces.

## Settings Migration

**SettingsMigration.ts** (in Services/) handles version upgrades:

- Renames deprecated fields
- Adds new defaults
- Preserves user customizations
- Runs automatically on plugin load
