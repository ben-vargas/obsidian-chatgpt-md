# Documentation

This folder contains active project documentation plus historical feature-planning artifacts.

## Active docs

Prefer these as current references:

- `development.md` - build/test/lint commands, architecture overview, common tasks
- `message-flow.md` - end-to-end chat/message flow
- `tool-whitelist.md` - tool-calling model whitelist guidance
- `VERSION_MANAGEMENT.md` - version/release process
- `BUILD_OPTIMIZATION.md` - bundle analysis/build optimization notes
- `CREATE_SERVICE.md` - historical provider/service guidance; verify against current provider registry before following literally

Root `README.md`, root `CLAUDE.md`, and code are more authoritative than older docs when they conflict.

## Historical feature artifacts

These folders are implementation artifacts from past feature work:

- `add-agents-feature/`
- `ai-agent-wizard/`
- `fix-streaming-markdown/`

They are useful for context and rationale, but do not treat old plans/status files as current truth. Always verify against current code.

## Updating docs

When code changes affect user/developer behavior, update docs in the same change when practical:

- User-facing setup/usage changes → `README.md`
- Agent/coding guidance → relevant `CLAUDE.md`
- Build/development flow → `docs/development.md`
- Message parsing/request flow → `docs/message-flow.md`
- Tool whitelist behavior → `docs/tool-whitelist.md` and `scripts/tool-whitelist/` docs

## Documentation style

- Prefer concise, actionable sections.
- Use current npm commands, not yarn.
- Mark historical or deprecated guidance clearly.
- Include exact file paths for implementation references.
- Avoid documenting secrets, local API keys, or personal vault content.

## Validation

Docs-only changes generally do not need a build. If docs include commands or generated examples, run the smallest practical validation or clearly state it was not run.
