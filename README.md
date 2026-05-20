# railsmith

Guardrails for your AI-augmented engineering workflow. A TypeScript SDK and zero-dependency CLI for crafting and maintaining `AGENTS.md` files that actually hold up.

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
npx railsmith init --root . --scope packages/api:retry     # scoped to a package
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

Railsmith ships with a curated snapshot of patterns from [`jefking/cloud-patterns`](https://github.com/jefking/cloud-patterns) and [`jefking/design-patterns`](https://github.com/jefking/design-patterns). Sync them anytime:

```bash
npm run sync:patterns
```

```ts
import { cloudPatterns, designPatterns, getBundledPattern } from "@moltenbot/railsmith/patterns";
```

---

## Contributing

```bash
npm ci && npm run build && npm test
```

100% line, branch, and function coverage enforced. Releases publish automatically from `main` with the `NPM_TOKEN` GitHub Actions secret when the version in `package.json` hasn't been published yet.
