# agents-markdown

TypeScript SDK and zero-runtime-dependency CLI for creating and safely maintaining `AGENTS.md` guardrails.

## Install

```bash
npm install --save-dev agents-markdown
```

## CLI

```bash
npx agents-md guide
npx agents-md doctor --root .
npx agents-md init --root . --dry-run
npx agents-md patterns list
npx agents-md init --root . --use cloud:retry
npx agents-md init --root . --pattern retry.pattern.json
npx agents-md init --root . --scope packages/api:retry.pattern.json
npx agents-md check --root .
```

Commands:
- `guide`: prints the agent-facing workflow shipped as `AGENT_GUIDE.md`.
- `doctor`: scans repo facts and validates existing guidance.
- `init`: creates or updates managed `AGENTS.md` blocks.
- `compose`: generates from a JSON config and optional pattern files.
- `diff`: prints proposed changes without writing files.
- `check`: validates managed markers and package-script references.
- `patterns`: lists bundled pattern ids from the vendored pattern snapshot.

By default, existing user-authored Markdown is preserved. Generated content is written inside:

```md
<!-- agents-md:start core -->
...
<!-- agents-md:end core -->
```

## SDK

```ts
import {
  cloudPatterns,
  generateAgentsMd,
  getBundledPattern,
  mergeAgentsMd,
  scanProject,
  suggestPatterns
} from "agents-markdown";

const repoFacts = scanProject(".");
const retryPattern = getBundledPattern("cloud:retry");
const result = generateAgentsMd({
  repoFacts,
  patterns: retryPattern ? [retryPattern] : []
});

const merged = mergeAgentsMd({
  existing: "# Team Notes\n",
  generated: result.files[0].content
});
```

## Pattern Shape

```ts
type AgentPattern = {
  id: string;
  title: string;
  intent: string;
  applyWhen: string[];
  doNotUseWhen: string[];
  invariants?: string[];
  verification?: string[];
  markdown: string;
  sources?: string[];
};
```

## Bundled Patterns

Release builds vendor all `AGENTS.md` pattern files from:
- `jefking/cloud-patterns`
- `jefking/design-patterns`

The sync is explicit and dependency-free:

```bash
npm run sync:patterns
```

It writes ignored generated artifacts under `patterns/`, `src/generated/`, and `dist/generated/`. `npm run build`, `npm test`, `npm run coverage`, and `npm pack` refresh the pattern snapshot before compiling, so a clean checkout does not need committed pattern snapshots.

Use the bundled patterns from code:

```ts
import { bundledPatterns, cloudPatterns, designPatterns, getBundledPattern } from "agents-markdown/patterns";
```

Use them from the CLI:

```bash
agents-md patterns list
agents-md init --use cloud:retry
agents-md init --scope-use packages/api:cloud:retry
```

Use `scope` to generate nested `AGENTS.md` files for specific packages, services, or app folders:

```ts
generateAgentsMd({
  patterns: [
    { pattern: retryPattern, scope: "packages/api" }
  ]
});
```

## Quality Gates

```bash
npm test
npm run coverage
```

`npm run coverage` enforces 100% line, branch, and function coverage across the built SDK and CLI modules.

## CI and Release

Pull requests and pushes to `main` run `.github/workflows/ci.yml`:
- `npm ci`
- `npm run coverage`
- `npm pack --dry-run`

Publishing is handled by `.github/workflows/publish.yml`. It runs only after the `CI` workflow succeeds on a `main` branch push, checks out the validated commit, refreshes the bundled pattern snapshot during release validation/packaging, and publishes to npm when the `package.json` version is not already published.

Configure npm trusted publishing for:
- Organization/user: `Molten-Bot`
- Repository: `agents-markdown`
- Workflow filename: `publish.yml`

The publish workflow uses `id-token: write` and `npm publish` so npm can authenticate via OIDC and attach provenance for eligible public packages.
