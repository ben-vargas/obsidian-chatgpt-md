# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.9 on Node.js 24+
**Primary Dependencies**: Obsidian API, AI SDK 7, provider SDKs, Zod; add feature-specific dependencies or N/A
**Storage**: Obsidian vault Markdown/frontmatter and local plugin settings; add feature-specific storage or N/A
**Testing**: Jest with colocated `src/**/*.test.ts` tests plus targeted manual Obsidian checks
**Target Platform**: Obsidian desktop and mobile; identify platform-specific limitations
**Project Type**: Obsidian community plugin bundled by esbuild
**Performance Goals**: [Feature-specific latency, startup, streaming, or vault-scale goal or N/A with rationale]
**Constraints**: Human-approved data sharing, credential redaction, CommonJS plugin bundle, mobile compatibility
**Scale/Scope**: [Affected commands/services/providers/settings/docs and expected vault/model scale]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Privacy and human control**: Identify data sent to providers/tools, approval boundaries,
  credential routing, and logging exposure. Use `N/A` only with a specific rationale.
- **Architecture and ownership**: Place wiring in `ServiceContainer`, orchestration in commands,
  business behavior in services, UI in views, pure logic in utilities, provider metadata in the
  registry, and protocol differences in adapters.
- **Compatibility and configuration**: Record effects on persisted settings, frontmatter merge
  priority, model prefixes, migrations, provider UI/docs, and desktop/mobile behavior.
- **Verification**: Define automated regression coverage and targeted manual Obsidian checks. List
  the applicable format, lint, typecheck, test, and build commands.
- **Simplicity and documentation**: Justify new dependencies or abstractions and identify required
  README, security, development, message-flow, guidance, or changelog updates.

Any failed gate MUST be recorded in Complexity Tracking with maintainer approval and a removal or
migration path. Re-check these gates after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── main.ts                    # Bootstrap and command registration only
├── core/                      # Explicit ServiceContainer composition root
├── Commands/                  # Thin Obsidian command handlers
├── Services/
│   ├── Adapters/              # Provider protocol differences
│   ├── Providers/             # Provider metadata and factories
│   └── Tools/                 # Narrow AI tool definitions
├── Views/                     # Obsidian settings UI and modals
├── Utilities/                 # Stateless helpers
├── Models/                    # Internal data models
├── Types/                     # Cross-service contracts
└── **/*.test.ts               # Colocated Jest tests

README.md / SECURITY.md / docs/ / relevant guidance files
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
