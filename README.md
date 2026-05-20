# agents-markdown

Guardrails for your AI-augmented engineering workflow. A TypeScript SDK and zero-dependency CLI for crafting and maintaining `AGENTS.md` files that actually hold up.

---

## Install

```bash
npm install --save-dev @moltenbot/agents-markdown
```

---

## CLI

```bash
npx agents-md guide                                         # read the agent workflow guide
npx agents-md doctor --root .                              # scan and validate your repo
npx agents-md init --root . --dry-run                      # preview before writing
npx agents-md init --root . --use cloud:retry              # init with a bundled pattern
npx agents-md init --root . --scope packages/api:retry     # scoped to a package
npx agents-md check --root .                               # validate managed markers
npx agents-md patterns list                                # browse bundled patterns
```

Your hand-written Markdown is never touched. Generated content lives inside clearly marked blocks:

```md
<!-- agents-md:start core -->
...
<!-- agents-md:end core -->
```

---

## SDK

```ts
import { generateAgentsMd, getBundledPattern, mergeAgentsMd, scanProject } from "@moltenbot/agents-markdown";

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

agents-markdown ships with a curated snapshot of patterns from [`jefking/cloud-patterns`](https://github.com/jefking/cloud-patterns) and [`jefking/design-patterns`](https://github.com/jefking/design-patterns). Sync them anytime:

```bash
npm run sync:patterns
```

```ts
import { cloudPatterns, designPatterns, getBundledPattern } from "@moltenbot/agents-markdown/patterns";
```

---

## Contributing

```bash
npm ci && npm run build && npm test
```

100% line, branch, and function coverage enforced. Releases publish automatically via OIDC when the version in `package.json` hasn't been published yet.
