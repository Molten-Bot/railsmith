# railsmith

Railsmith is not just an AGENTS.md generator. It is a maintenance loop for agent-readable engineering context.

---

## Install

```bash
npm install --save-dev @moltenbot/railsmith
```

---

## CLI

```bash
npx railsmith guide                                         # read the agent workflow guide
npx railsmith doctor --root .                              # scan and validate your repo
npx railsmith init --root . --dry-run                      # preview before writing
npx railsmith init --root . --use cloud:retry              # init with a bundled pattern
npx railsmith init --root . --scope-use packages/api:cloud:retry # scoped bundled pattern
npx railsmith learn cloud:retry                            # read full pattern guidance
npx railsmith check --root .                               # validate managed markers
npx railsmith patterns list                                # browse bundled patterns
```

Your hand-written Markdown is never touched. Generated content lives inside clearly marked blocks:

```md
<!-- railsmith:start core -->
...
<!-- railsmith:end core -->
```

---

## SDK

```ts
import { generateAgentsMd, getBundledPattern, mergeAgentsMd, scanProject } from "@moltenbot/railsmith";

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

---

## Bundled Patterns

Railsmith ships with a curated snapshot of patterns from [`jefking/cloud-patterns`](https://github.com/jefking/cloud-patterns) and [`jefking/design-patterns`](https://github.com/jefking/design-patterns).

See [PATTERNS.md](./PATTERNS.md) for the complete bundled list. Common starting points:

| Pattern | Use when |
| --- | --- |
| `cloud:retry` | Anticipated transient faults need bounded, delay-aware retries. |
| `cloud:circuit-breaker` | Repeated remote dependency failures should fail fast until recovery. |
| `cloud:cache-aside` | Reads can populate and reuse a cache beside an authoritative store. |
| `cloud:queue-based-load-leveling` | Bursty producers need buffering before sustainable downstream processing. |
| `cloud:rate-limiting` | Workload consumption must stay within dependency quotas or capacity. |
| `cloud:saga` | Distributed business transactions need local commits plus compensations. |
| `cloud:strangler-fig` | Legacy capability should move incrementally to a new implementation. |
| `cloud:sidecar` | Supporting capability belongs beside the app, not embedded inside it. |
| `design:creational/dependency-injection` | Construction and dependency lifetime should stay at a composition boundary. |
| `design:structural/adapter` | Client code needs an incompatible object through an expected interface. |
| `design:behavioral/strategy` | Alternative algorithms should share one interface and swap cleanly. |
| `design:concurrency/thread-pool` | Queued work should reuse bounded workers instead of creating threads repeatedly. |

Sync bundled snapshots anytime:

```bash
npm run sync:patterns
```

```ts
import { cloudPatterns, designPatterns, getBundledPattern } from "@moltenbot/railsmith/patterns";
```

Use `npx railsmith learn <pattern-id>` when you want the complete pattern contract, including applicability gates, invariants, verification prompts, sources, and the bundled source guidance.

---

## Contributing

```bash
npm ci && npm run build && npm test
```

100% line, branch, and function coverage enforced. Releases publish automatically from `main` with the `NPM_TOKEN` GitHub Actions secret when the version in `package.json` hasn't been published yet.
