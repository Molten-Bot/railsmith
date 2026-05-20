# railsmith Agent Guide

This guide is shipped with the npm package so an agent can help a user create or maintain `AGENTS.md` without guessing the workflow.

Reference status:
- AGENTS.md public guidance verified against https://agents.md/ on 2026-05-20.
- TypeScript dev dependency checked with `npm view typescript version` on 2026-05-20; latest observed release was `6.0.3`.
- GitHub Actions references checked on 2026-05-20; workflows use `actions/checkout@v6` and `actions/setup-node@v6`.
- npm trusted publishing guidance checked on 2026-05-20; release uses GitHub Actions OIDC instead of a long-lived npm token.
- Runtime dependency count: zero.

## Default Workflow

1. Run `railsmith doctor --root <project>` to inspect package manager, scripts, workspaces, CI files, and existing agent guidance.
2. Run `railsmith init --root <project> --dry-run` to show the proposed root `AGENTS.md` managed block.
3. Ask the user which architectural or design patterns should be included.
4. Add approved pattern JSON files with `--pattern <file>` for root guidance or `--scope <dir:file>` for nested scoped guidance.
   Use bundled pattern ids with `--use <id>` or `--scope-use <dir:id>` when the released package already contains the needed pattern.
5. Rerun with `--dry-run` and review the diff with the user.
6. Rerun without `--dry-run` only after the user approves the change.
7. Run `railsmith check --root <project>` after writing to catch broken managed markers or stale package-script references.

## Agent Rules

- Preserve user-authored text outside `<!-- railsmith:start core -->` and `<!-- railsmith:end core -->`.
- Do not overwrite an existing `AGENTS.md` wholesale unless the user explicitly asks.
- Prefer scoped nested `AGENTS.md` files when a pattern only applies to a package, service, app, or bounded folder.
- Keep the final Markdown plain and portable; do not add tool-specific files unless the user asks for adapters.
- Treat pattern applicability gates as guardrails. If a requested pattern does not fit, say so and propose a closer pattern instead.

## Pattern JSON Shape

```json
{
  "id": "retry",
  "title": "Retry Pattern",
  "intent": "Retry transient failures with bounded, delay-aware policies.",
  "applyWhen": [
    "The failure is temporary.",
    "The operation is idempotent or duplicate-protected."
  ],
  "doNotUseWhen": [
    "The error is deterministic.",
    "Retries would exceed caller deadlines."
  ],
  "invariants": [
    "Attempts are bounded.",
    "Retryable and non-retryable errors are classified."
  ],
  "verification": [
    "Terminal errors are not retried.",
    "Duplicate attempts do not duplicate business effects."
  ],
  "markdown": "# Retry Pattern\\n\\nUse bounded retries for transient faults.",
  "sources": [
    "https://learn.microsoft.com/en-us/azure/architecture/patterns/retry"
  ]
}
```

## Useful Commands

```bash
railsmith guide
railsmith doctor --root .
railsmith patterns list
railsmith init --root . --dry-run
railsmith init --root . --use cloud:retry
railsmith init --root . --pattern retry.pattern.json
railsmith init --root . --scope-use packages/api:cloud:retry
railsmith init --root . --scope packages/api:retry.pattern.json
railsmith diff --root . --mode detailed
railsmith check --root .
```

## CI and Release Notes For Agents

- Pull requests must pass `.github/workflows/ci.yml`, which runs install, 100% coverage, and `npm pack --dry-run`.
- Merges to `main` trigger the same CI workflow; publishing is gated by the successful `CI` workflow run.
- `.github/workflows/publish.yml` publishes only from the validated `main` commit and skips if the package version already exists on npm.
- Release publishing refreshes ignored generated pattern artifacts before the final build/test/package/publish steps. This vendors all current `AGENTS.md` files from `jefking/cloud-patterns` and `jefking/design-patterns` into the package snapshot without committing the generated snapshot to source.
- npm publishing uses the repository secret `NPM_TOKEN`; configure it in GitHub Actions secrets before relying on release automation.
