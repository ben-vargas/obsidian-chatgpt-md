<!--
Sync Impact Report
- Version change: unversioned template -> 1.0.0
- Modified principles:
  - Placeholder Principle 1 -> I. Privacy and Human Control (NON-NEGOTIABLE)
  - Placeholder Principle 2 -> II. Explicit Architecture and Ownership
  - Placeholder Principle 3 -> III. Compatibility and Configuration Integrity
  - Placeholder Principle 4 -> IV. Reliability Through Verification
  - Placeholder Principle 5 -> V. Simplicity and Focused Change
- Added sections:
  - Runtime, Security, and Documentation Constraints
  - Development Workflow and Quality Gates
- Removed sections:
  - Unresolved placeholder sections and instructional comments
- Templates requiring updates:
  - ✅ updated: .specify/templates/plan-template.md
  - ✅ updated: .specify/templates/spec-template.md
  - ✅ updated: .specify/templates/tasks-template.md
  - ✅ reviewed; no change required: .specify/templates/checklist-template.md
  - ✅ reviewed; no command templates installed: .specify/templates/commands/
- Runtime guidance reviewed:
  - ✅ no change required: README.md, AGENTS.md, all per-directory AGENTS.md files,
    CONTRIBUTING.md, SECURITY.md, docs/development.md, docs/message-flow.md,
    and CHANGELOG.md
- Deferred items: none
-->

# ChatGPT MD Constitution

## Core Principles

### I. Privacy and Human Control (NON-NEGOTIABLE)
AI tools MUST remain opt-in and MUST preserve every applicable approval boundary: approval before
execution, review of results, and explicit selection before vault or web content is sent to a model.
Rejected or unselected content MUST NOT enter model context. Credentials MUST be sent only to the
provider or endpoint selected by the resolved configuration and MUST never appear in logs, errors,
tests, documentation, or generated artifacts. Prompts, note bodies, linked-note content, and tool
results MUST NOT be logged by default. These rules protect users whose private vault data and paid
credentials are entrusted to the plugin.

### II. Explicit Architecture and Ownership
`src/core/ServiceContainer.ts` MUST remain the sole composition root and MUST use explicit
constructor injection; string-based service lookup, hidden fallback services, and framework-style DI
are prohibited. Commands MUST orchestrate, services MUST own stateful or business behavior, views
MUST render and collect input, and utilities MUST remain stateless where practical. Operational
provider metadata and factories MUST live in `ProviderRegistry`; provider protocol differences MUST
live in adapters. New behavior MUST be placed in the narrowest existing owner instead of creating a
parallel architecture. This keeps runtime dependencies visible and provider behavior consistent.

### III. Compatibility and Configuration Integrity
Persisted settings, model prefixes, note frontmatter, and effective configuration priority are
user-facing compatibility contracts. The merge order MUST remain provider defaults, default chat
frontmatter, global settings, agent frontmatter/body, then note frontmatter unless an approved spec
explicitly changes it. Settings changes MUST include defaults, UI support, and an idempotent migration
when existing data needs conversion. Provider changes MUST update the adapter, registry, settings,
UI, documentation, and routing/completeness tests as applicable. Desktop and mobile behavior MUST be
considered whenever networking, streaming, cancellation, or Obsidian APIs are affected.

### IV. Reliability Through Verification
Every behavior change MUST have deterministic automated coverage at the closest practical level;
provider routing, settings migrations, parsing of external data, streaming, and tool filtering require
regression tests. External values MUST enter as `unknown` and be validated defensively. If automation
is impractical, the plan and pull request MUST state why and provide a concrete manual Obsidian test.
Before handoff, contributors MUST run the applicable npm checks: formatting, linting, type checking,
Jest tests, and production build. Existing lint warnings may be reported without blocking a change,
but new warnings or unexplained failures are not acceptable.

### V. Simplicity and Focused Change
Changes MUST be small, reviewable, and limited to current requirements. Contributors MUST prefer
incremental extraction of pure helpers over broad rewrites, reuse the provider registry and existing
service boundaries, and avoid speculative abstractions, generic frameworks, or dependencies for
simple parsing, formatting, validation, or logging. Generated files and unrelated formatting MUST
not be included in source changes. Any constitutional complexity exception MUST identify the simpler
alternative and explain with concrete evidence why it cannot satisfy the requirement.

## Runtime, Security, and Documentation Constraints

- Runtime source MUST remain TypeScript compatible with the supported Node.js, Obsidian, and mobile
  environments. AI SDK ESM dependencies MUST continue to bundle through esbuild into the CommonJS
  `main.js` required by Obsidian.
- npm and `package-lock.json` are the package-management source of truth. `main.js`, coverage output,
  local settings, logs, and editor state MUST NOT be edited or committed as source.
- Network, provider, and tool errors MUST be actionable without revealing credentials or private
  content. Logging MUST use the project logger and its redaction/debug controls.
- User-visible behavior, setup, settings, privacy boundaries, message flow, provider support, and
  release behavior MUST be documented in the relevant README, security, development, or guidance
  files in the same change.
- Tool or provider scripts that can spend money or access local settings MUST make that behavior
  explicit, start with safe limits where available, and MUST NOT silently modify source files.

## Development Workflow and Quality Gates

1. Specifications MUST define prioritized, independently testable user journeys and measurable
   outcomes. They MUST identify privacy/data flow, compatibility, provider/settings, and platform
   effects, using explicit not-applicable rationales when an area is unaffected.
2. Plans MUST pass the Constitution Check before research and again after design. Any violation MUST
   be recorded in Complexity Tracking with the rejected simpler alternative and reviewer approval.
3. Tasks MUST include applicable implementation, regression tests, migrations, documentation, and
   manual Obsidian checks. Privacy-sensitive flows MUST include explicit approval and data-selection
   verification tasks.
4. Implementation MUST preserve focused commits and exact file ownership. Pure behavior MUST be
   tested without the Obsidian runtime where practical; runtime UI and streaming changes MUST also
   receive targeted manual validation.
5. Before review or handoff, run `npm run format:check`, `npm run lint`, `npm run typecheck`,
   `npm test -- --runInBand`, and `npm run build`, or document why a check is not applicable or could
   not run. Reviews MUST confirm documentation and migration needs, not only code correctness.

## Governance

This constitution supersedes conflicting development guidance. More specific repository guidance
may add constraints but MUST NOT weaken these principles. An amendment requires a reviewed change to
this file that states the motivation, updates the Sync Impact Report, classifies the semantic version
change, and synchronizes affected templates and runtime guidance. Backward-incompatible principle
removal or redefinition requires a MAJOR version; a new principle or materially expanded obligation
requires a MINOR version; clarification without changed obligations requires a PATCH version.

Every feature plan and code review MUST assess constitutional compliance. Exceptions are temporary,
must be documented in the plan's Complexity Tracking table, must include a migration or removal path,
and require explicit maintainer approval. The constitution's ratification date remains fixed; the last
amended date changes whenever its normative content changes. Runtime implementation details remain
in `AGENTS.md`, the applicable directory `AGENTS.md`, `CONTRIBUTING.md`, and active documentation, all subordinate
to this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-07-22 | **Last Amended**: 2026-07-22
