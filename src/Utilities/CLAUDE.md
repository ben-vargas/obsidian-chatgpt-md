# Utilities

Pure helper functions extracted from services for reusability and testability. Functions here have no side effects and are covered by Jest tests.

## Text Processing

### TextHelpers.ts

**Text formatting utilities**

- `getHeadingPrefix(level)` - Returns `"### "` for heading level 3, etc.
- `sanitizeTitle(title)` - Remove invalid filename characters (`:`, `\`, `/`, `*`, `?`, `"`, `<`, `>`, `|`)

### MessageHelpers.ts

**Message formatting utilities**

- `extractRoleAndMessage(message)` - Parse `role::assistant` format, returns `{ role, content }`
- `splitMessages(text, separator)` - Split text by message separator
- `stripRolePrefix(line)` - Remove `role::` prefix from line

### YamlHelpers.ts

**YAML processing utilities**

- `objectToYamlFrontmatter(obj)` - Convert object to YAML frontmatter string
- `parseSettingsFrontmatter(frontmatterStr)` - Parse YAML frontmatter string to object

## Editor Utilities

### EditorHelpers.ts

**Editor manipulation helpers**

- Cursor positioning helpers
- Text insertion helpers
- Range operations

### ResponseHelpers.ts

**AI response handling**

- `insertAssistantHeader(editor, headingPrefix, modelName)` - Insert response header (`### assistant (model)`)
- Returns `{ initialCursor, newCursor }` for cursor management

### StreamingHelpers.ts

**Streaming utilities**

- `DEFAULT_FLUSH_INTERVAL_MS = 50` - Default flush interval
- `flushBufferedText(editor, text, cursor, setAtCursor)` - Flush text to editor, returns new cursor
- `calculateCursorAfterInsert(editor, text, insertPosition)` - Calculate cursor after text insertion

## Configuration Utilities

### FrontmatterHelpers.ts

**Frontmatter parsing utilities**

- `isTitleTimestampFormat(title, format)` - Check if title matches date format
- `getDefaultConfigForService(service)` - Get default config for AI service
- `getDefaultModelForService(service)` - Get default model for AI service

### ProviderHelpers.ts

**AI provider utilities**

- `aiProviderFromUrl(url, model)` - Determine provider from URL/model prefix
- `aiProviderFromKeys(settings)` - Determine provider from available API keys
- `extractProviderFromModel(model)` - Extract provider prefix from model string

## Validation

### InputValidator.ts

**Input validation utilities**

- `validateNonEmpty(value, name)` - Check value is not empty
- `validateUrl(url)` - Validate URL format
- `validateModelName(model)` - Validate model name format

### ModelFilteringHelper.ts

**Model list filtering**

- `filterModelsByProvider(models, provider)` - Filter models by provider prefix
- `fuzzyMatchModels(models, query)` - Fuzzy search in model list

## Error Handling

### AsyncErrorHandler.ts

**Async error handling utilities**

- `withErrorHandling(fn, errorHandler)` - Wrap async function with error handling
- `retryWithBackoff(fn, maxRetries, delay)` - Retry with exponential backoff

### ErrorMessageFormatter.ts

**User-friendly error messages**

- `formatApiError(error, provider)` - Format API error for display
- HTTP status code mapping to user-friendly messages
- Provider-specific error message formatting

## Modal Utilities

### ModalHelpers.ts

**Modal construction helpers**

- `createButton(container, text, onClick)` - Create styled button
- `createTextInput(container, placeholder)` - Create text input
- `createCheckbox(container, label, checked)` - Create checkbox
- Common modal layout patterns

## Testing

Tests are located alongside utilities in `*.test.ts` files:

- `TextHelpers.test.ts`
- `MessageHelpers.test.ts`
- `FrontmatterHelpers.test.ts`
- `StreamingHandler.test.ts`

Run tests with: `yarn test` or `yarn test path/to/test.test.ts`
