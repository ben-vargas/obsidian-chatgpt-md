# Scripts

Maintenance scripts for builds, bundle analysis, and model/tool whitelist workflows.

## General rules

- Scripts may read local plugin settings (`data.json`) and may call provider APIs. Treat API keys as secrets.
- Do not print API keys, full prompts, vault content, or private response payloads.
- Generated output should not be committed unless intentionally refreshing documented artifacts.
- Prefer npm scripts from `package.json` for standard project workflows.
- Keep scripts ESM-compatible (`.mjs`) unless there is a strong reason not to.

## Main scripts

### `analyze-bundle.mjs`

Bundle analysis helper. Usually invoked through:

```bash
npm run analyze
npm run build:analyze
npm run build:full-analysis
```

Do not treat bundle output as source code.

### `scripts/tool-whitelist/`

Manual workflow for discovering models, testing tool support, and generating whitelist suggestions. See `scripts/tool-whitelist/AGENTS.md` and the README files in that folder.

### `update-version.mjs` and `version-bump.mjs`

Release versioning. `node update-version.mjs <x.y.z>` updates `package.json`, `manifest.json`, `versions.json`, commits, and tags. `version-bump.mjs` (npm `version` lifecycle) syncs manifest/versions from the package version. After tagging, publish a GitHub release with `main.js`, `manifest.json`, and `styles.css` attached.

## Editing scripts

When changing scripts:

1. Keep CLI flags backward-compatible when practical.
2. Make dangerous/costly API behavior explicit in logs and docs.
3. Fail clearly with actionable errors if required files/API keys are missing.
4. Avoid automatically editing source files unless the script is explicitly designed and documented to do that.
5. Prefer deterministic JSON/text output for generated artifacts.

## Validation

For source-affecting script changes:

```bash
npm run build
npm test -- --runInBand
```

For script-only behavior, run the specific script with a safe/dry-run/small-limit option when available.
