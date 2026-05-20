# agents-md Agent Guide

This guide is shipped with the npm package so an agent can help a user create or maintain `AGENTS.md` without guessing the workflow.

Reference status:
- AGENTS.md public guidance verified against https://agents.md/ on 2026-05-20.
- TypeScript dev dependency checked with `npm view typescript version` on 2026-05-20; latest observed release was `6.0.3`.
- Runtime dependency count: zero.

## Default Workflow

1. Run `agents-md doctor --root <project>` to inspect package manager, scripts, workspaces, CI files, and existing agent guidance.
2. Run `agents-md init --root <project> --dry-run` to show the proposed root `AGENTS.md` managed block.
3. Ask the user which architectural or design patterns should be included.
4. Add approved pattern JSON files with `--pattern <file>` for root guidance or `--scope <dir:file>` for nested scoped guidance.
5. Rerun with `--dry-run` and review the diff with the user.
6. Rerun without `--dry-run` only after the user approves the change.
7. Run `agents-md check --root <project>` after writing to catch broken managed markers or stale package-script references.

## Agent Rules

- Preserve user-authored text outside `<!-- agents-md:start core -->` and `<!-- agents-md:end core -->`.
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
agents-md guide
agents-md doctor --root .
agents-md init --root . --dry-run
agents-md init --root . --pattern retry.pattern.json
agents-md init --root . --scope packages/api:retry.pattern.json
agents-md diff --root . --mode detailed
agents-md check --root .
```
