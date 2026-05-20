# agents-markdown

TypeScript SDK and zero-runtime-dependency CLI for creating and safely maintaining `AGENTS.md` guardrails.

Reference status:
- AGENTS.md public guidance checked against https://agents.md/ on 2026-05-20.
- TypeScript release checked with `npm view typescript version` on 2026-05-20; latest observed release was `6.0.3`.
- GitHub Actions references checked on 2026-05-20; workflows use `actions/checkout@v6` and `actions/setup-node@v6`.
- npm trusted publishing guidance checked on 2026-05-20; release uses GitHub Actions OIDC instead of a long-lived npm token.
- Runtime dependencies: none.

## Install

```bash
npm install --save-dev agents-markdown
```

## CLI

```bash
npx agents-md guide
npx agents-md doctor --root .
npx agents-md init --root . --dry-run
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

By default, existing user-authored Markdown is preserved. Generated content is written inside:

```md
<!-- agents-md:start core -->
...
<!-- agents-md:end core -->
```

## SDK

```ts
import {
  generateAgentsMd,
  mergeAgentsMd,
  scanProject,
  suggestPatterns
} from "agents-markdown";

const repoFacts = scanProject(".");
const result = generateAgentsMd({
  repoFacts,
  patterns: [
    {
      id: "retry",
      title: "Retry Pattern",
      intent: "Retry transient failures with bounded, delay-aware policies.",
      applyWhen: ["The failure is temporary."],
      doNotUseWhen: ["The error is deterministic."],
      markdown: "# Retry Pattern\n\nUse bounded retries for transient faults."
    }
  ]
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

Publishing is handled by `.github/workflows/publish.yml`. It runs only after the `CI` workflow succeeds on a `main` branch push, checks out the validated commit, reruns the release validation, and publishes to npm when the `package.json` version is not already published.

Configure npm trusted publishing for:
- Organization/user: `Molten-Bot`
- Repository: `agents-markdown`
- Workflow filename: `publish.yml`

The publish workflow uses `id-token: write` and `npm publish` so npm can authenticate via OIDC and attach provenance for eligible public packages.
