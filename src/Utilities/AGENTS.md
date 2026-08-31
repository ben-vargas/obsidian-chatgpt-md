# Utilities guide

Authoritative contributor rules are in `/AGENTS.md` and `/CONTRIBUTING.md`.

Utilities are stateless and should be tested without Obsidian where practical.

Current high-value modules:

- `AiRequestOptions.ts` — legacy/frontmatter names to AI SDK 7 generation options
- `AiErrorFormatter.ts` — safe streaming error formatting and `toErrorMessage()` for unknown caught values
- `AgentWizardHelpers.ts` — validated wizard JSON parsing
- `EditorHelpers.ts` — simple editor mutations
- `ErrorMessageFormatter.ts` — HTTP/user error messages
- `FrontmatterHelpers.ts` — registry-derived defaults and URL maps
- `Logger.ts` — debug gating and recursive credential redaction
- `MessageHelpers.ts` — links, comments, and message splitting
- `ModelFilteringHelper.ts` — internal model-ID parsing
- `PromptHelpers.ts` — AI SDK message/instructions preparation
- `ProviderHelpers.ts` — backward-compatible provider detection
- `ResponseHelpers.ts` — assistant-header insertion
- `TextHelpers.ts` — role/header formatting
- `YamlHelpers.ts` — Obsidian YAML parsing and frontmatter removal

Do not add generic retry/error/validation frameworks without a current caller. External values enter as `unknown`; use small local guards. Avoid compatibility re-exports with no runtime consumer.
