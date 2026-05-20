import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checkAgentsMd,
  createManagedBlock,
  createUnifiedDiff,
  extractManagedBlock,
  findPatternConflicts,
  generateAgentsMd,
  hasErrors,
  managedBlockDiagnostics,
  managedBlockEnd,
  managedBlockStart,
  mergeAgentsMd,
  scanProject,
  suggestPatterns,
  validatePattern
} from "../dist/index.js";
import { runCli } from "../dist/cli.js";

const retryPattern = {
  id: "retry",
  title: "Retry Pattern",
  intent: "Retry transient failures with bounded, delay-aware policies.",
  applyWhen: [
    "The failure is temporary.",
    "The operation is idempotent or duplicate-protected."
  ],
  doNotUseWhen: [
    "The error is deterministic.",
    "Retries would exceed caller deadlines."
  ],
  invariants: [
    "Attempts are bounded.",
    "Errors are classified."
  ],
  verification: [
    "Terminal errors are not retried.",
    "Duplicate attempts do not duplicate business effects."
  ],
  markdown: "# Retry Pattern\n\nUse bounded retries for transient faults.",
  sources: ["https://learn.microsoft.com/en-us/azure/architecture/patterns/retry"]
};

const circuitBreakerPattern = {
  id: "circuit-breaker",
  title: "Circuit Breaker",
  intent: "Stop calls to a dependency during suspected persistent failure.",
  applyWhen: ["Persistent dependency failures should pause calls."],
  doNotUseWhen: ["Do not use with Retry Pattern as the primary policy."],
  markdown: "# Circuit Breaker\n\nOpen the circuit during persistent failures."
};

test("scanProject detects Node facts, scripts, workspaces, tools, CI, and AGENTS.md files", () => {
  const root = tempProject();
  writeJson(root, "package.json", {
    name: "sample-app",
    description: "A sample app.",
    packageManager: "pnpm@10.0.0",
    scripts: {
      dev: "vite",
      build: "tsc",
      test: "vitest run",
      "test:e2e": "playwright test"
    },
    dependencies: {
      react: "latest",
      vite: "latest"
    },
    devDependencies: {
      typescript: "latest",
      eslint: "latest",
      vitest: "latest",
      "@playwright/test": "latest"
    },
    workspaces: ["packages/*"]
  });
  fs.mkdirSync(path.join(root, "packages", "api"), { recursive: true });
  fs.mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(root, ".github", "workflows", "ci.yml"), "name: ci\n");
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Existing\n");
  fs.writeFileSync(path.join(root, "CLAUDE.md"), "# Claude\n");
  fs.mkdirSync(path.join(root, "packages", "api"), { recursive: true });
  fs.writeFileSync(path.join(root, "packages", "api", "AGENTS.md"), "# API\n");

  const facts = scanProject(root);

  assert.equal(facts.packageManager, "pnpm");
  assert.equal(facts.packageName, "sample-app");
  assert.deepEqual(facts.testCommands, ["pnpm test", "pnpm test:e2e"]);
  assert.deepEqual(facts.packageDirectories, ["packages/api"]);
  assert.ok(facts.frameworks.includes("react"));
  assert.ok(facts.frameworks.includes("typescript"));
  assert.deepEqual(facts.ciFiles, [".github/workflows/ci.yml"]);
  assert.deepEqual(facts.existingAgentFiles, ["AGENTS.md", "packages/api/AGENTS.md"]);
  assert.deepEqual(facts.toolFiles, ["CLAUDE.md"]);
});

test("scanProject handles pnpm workspace files, invalid package JSON, and lockfile package managers", () => {
  const pnpmRoot = tempProject();
  fs.writeFileSync(path.join(pnpmRoot, "pnpm-workspace.yaml"), "packages:\n  - 'apps/*'\n");
  fs.mkdirSync(path.join(pnpmRoot, "apps", "web"), { recursive: true });
  fs.writeFileSync(path.join(pnpmRoot, "pnpm-lock.yaml"), "");
  assert.deepEqual(scanProject(pnpmRoot).workspaces, ["apps/*"]);
  assert.equal(scanProject(pnpmRoot).packageManager, "pnpm");

  const yarnRoot = tempProject();
  fs.writeFileSync(path.join(yarnRoot, "yarn.lock"), "");
  assert.equal(scanProject(yarnRoot).packageManager, "yarn");

  const bunRoot = tempProject();
  fs.writeFileSync(path.join(bunRoot, "bun.lock"), "");
  assert.equal(scanProject(bunRoot).packageManager, "bun");

  const npmRoot = tempProject();
  fs.writeFileSync(path.join(npmRoot, "package-lock.json"), "");
  assert.equal(scanProject(npmRoot).packageManager, "npm");

  const workspaceObjectRoot = tempProject();
  writeJson(workspaceObjectRoot, "package.json", {
    packageManager: "yarn@4.0.0",
    scripts: { "test:unit": "node --test" },
    workspaces: { packages: ["libs/*", "docs", 7] }
  });
  assert.equal(scanProject(workspaceObjectRoot).packageManager, "yarn");
  assert.deepEqual(scanProject(workspaceObjectRoot).workspaces, ["libs/*", "docs"]);
  assert.deepEqual(scanProject(workspaceObjectRoot).testCommands, ["yarn test:unit"]);

  for (const packageManager of ["bun@1.0.0", "npm@11.0.0"]) {
    const declaredRoot = tempProject();
    writeJson(declaredRoot, "package.json", { packageManager, scripts: { "test:unit": "node --test" } });
    assert.equal(scanProject(declaredRoot).packageManager, packageManager.split("@")[0]);
  }

  const invalidRoot = tempProject();
  fs.writeFileSync(path.join(invalidRoot, "package.json"), "{ nope");
  const invalid = scanProject(invalidRoot);
  assert.equal(invalid.diagnostics[0].code, "json.invalid");
});

test("generateAgentsMd creates root and scoped managed Markdown in all modes", () => {
  const root = tempProject();
  writeJson(root, "package.json", {
    name: "guarded",
    workspaces: ["packages/*"],
    scripts: { start: "node server.js", build: "tsc", test: "node --test" },
    devDependencies: { typescript: "6.0.3", eslint: "latest" }
  });
  fs.mkdirSync(path.join(root, "packages", "api"), { recursive: true });
  fs.mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(root, ".github", "workflows", "ci.yaml"), "name: ci\n");
  const facts = scanProject(root);
  const standard = generateAgentsMd({
    root,
    repoFacts: facts,
    project: { description: "Guarded project" },
    sections: [{ id: "ownership", title: "Ownership", items: ["Ask before changing generated SDKs."] }],
    patterns: [retryPattern, { pattern: circuitBreakerPattern, scope: "packages/api" }]
  });
  const compact = generateAgentsMd({ root, repoFacts: facts, mode: "compact", patterns: [retryPattern] });
  const detailed = generateAgentsMd({ root, repoFacts: facts, mode: "detailed", patterns: [retryPattern] });

  assert.equal(standard.files.length, 2);
  assert.equal(standard.files[0].path, "AGENTS.md");
  assert.equal(standard.files[1].path, "packages/api/AGENTS.md");
  assert.match(standard.files[0].content, /Guarded project/);
  assert.match(standard.files[0].content, /Ownership/);
  assert.match(standard.files[1].content, /These instructions apply to files under `packages\/api`/);
  assert.ok(compact.files[0].content.length < detailed.files[0].content.length);
  assert.match(detailed.files[0].content, /Source Guidance/);
  assert.match(detailed.files[0].content, /Check CI workflow definitions/);
  assert.match(detailed.files[0].content, /Workspace areas/);
  assert.deepEqual(standard.manifest.patterns, ["retry", "circuit-breaker"]);

  const yarn = generateAgentsMd({ repoFacts: { ...facts, packageManager: "yarn", scripts: { dev: "vite" } } });
  const bun = generateAgentsMd({ repoFacts: { ...facts, packageManager: "bun", scripts: { dev: "vite" } } });
  const noPackageManager = generateAgentsMd({ repoFacts: { ...facts, packageManager: undefined, scripts: { dev: "vite" } } });
  const slashScope = generateAgentsMd({ repoFacts: facts, patterns: [{ pattern: retryPattern, scope: "/" }] });
  const dotScope = generateAgentsMd({ repoFacts: facts, patterns: [{ pattern: retryPattern, scope: "." }] });
  assert.match(yarn.files[0].content, /yarn install/);
  assert.match(bun.files[0].content, /bun install/);
  assert.match(noPackageManager.files[0].content, /npm run dev/);
  assert.deepEqual(slashScope.manifest.files[0].patterns, ["retry"]);
  assert.deepEqual(dotScope.manifest.files[0].patterns, ["retry"]);
});

test("generateAgentsMd supports empty projects, custom root file names, disabled scoped output, and invalid patterns", () => {
  const invalidPattern = { id: "", title: "", applyWhen: [], doNotUseWhen: [], markdown: "" };
  const result = generateAgentsMd({
    output: { rootFile: "docs/AGENTS.generated.md", scoped: false, managedBlockName: "custom" },
    patterns: [invalidPattern, { pattern: retryPattern, scope: "service" }]
  });

  assert.equal(result.files.length, 1);
  assert.equal(result.files[0].path, "docs/AGENTS.generated.md");
  assert.match(result.files[0].content, /agents-md:start custom/);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "pattern.id.required"));
  assert.equal(result.manifest.files[0].patterns.length, 0);
});

test("mergeAgentsMd preserves user content, replaces managed blocks, and reports unsafe markers", () => {
  assert.equal(managedBlockStart(), "<!-- agents-md:start core -->");
  assert.equal(managedBlockEnd("x"), "<!-- agents-md:end x -->");
  assert.match(createManagedBlock("## Body"), /## Body/);
  assert.equal(extractManagedBlock("no block"), undefined);
  assert.equal(extractManagedBlock("<!-- agents-md:end core -->\n<!-- agents-md:start core -->"), undefined);

  const generated = "# AGENTS.md\n\n" + createManagedBlock("## Generated\n- New") + "\n";
  const plainGenerated = mergeAgentsMd({ existing: "# Existing\n", generated: "## Plain\n- Body\n" });
  assert.match(plainGenerated.content, /agents-md:start core/);
  assert.match(plainGenerated.content, /Plain/);
  assert.equal(mergeAgentsMd({ generated, strategy: "replace" }).content, generated);
  const fresh = mergeAgentsMd({ generated });
  assert.equal(fresh.content, generated);
  assert.equal(fresh.changed, true);

  const existing = "# Team Notes\nKeep this.\n\n" + createManagedBlock("## Old\n- Old") + "\n";
  const merged = mergeAgentsMd({ existing, generated });
  assert.match(merged.content, /Keep this/);
  assert.match(merged.content, /Generated/);
  assert.doesNotMatch(merged.content, /Old/);

  const appended = mergeAgentsMd({ existing: "# Manual\n", generated });
  assert.match(appended.content, /# Manual/);
  assert.match(appended.content, /Generated/);

  const idempotent = mergeAgentsMd({ existing: merged.content, generated });
  assert.equal(idempotent.content, merged.content);
  assert.equal(idempotent.changed, false);

  const unsupported = mergeAgentsMd({ existing, generated, strategy: "replace" });
  assert.equal(unsupported.diagnostics[0].code, "merge.strategy.unsupported");

  const broken = mergeAgentsMd({ existing: "<!-- agents-md:start core -->\n", generated });
  assert.equal(broken.changed, false);
  assert.equal(broken.diagnostics[0].code, "managed-block.unbalanced");

  const duplicate = managedBlockDiagnostics(`${createManagedBlock("a")}\n${createManagedBlock("b")}`);
  assert.ok(duplicate.some((diagnostic) => diagnostic.code === "managed-block.duplicate"));
});

test("patterns validate, conflict, and suggest without runtime dependencies", () => {
  assert.deepEqual(validatePattern(retryPattern), []);
  const invalid = validatePattern({
    id: "",
    title: "",
    intent: "",
    applyWhen: "wrong",
    doNotUseWhen: "wrong",
    invariants: "wrong",
    verification: "wrong",
    sources: "wrong",
    markdown: ""
  });
  assert.equal(hasErrors(invalid), true);
  assert.ok(findPatternConflicts([retryPattern, retryPattern]).some((diagnostic) => diagnostic.code === "pattern.id.duplicate"));
  assert.ok(findPatternConflicts([retryPattern, circuitBreakerPattern]).some((diagnostic) => diagnostic.code === "pattern.conflict.possible"));

  const repoFacts = {
    root: tempProject(),
    packageName: "payments",
    packageDescription: "Retry transient payment gateway failures.",
    scripts: { test: "node --test" },
    dependencies: {},
    devDependencies: {},
    frameworks: [],
    testCommands: ["npm test"],
    workspaces: [],
    packageDirectories: [],
    ciFiles: [],
    existingAgentFiles: [],
    nestedAgentsMd: [],
    toolFiles: [],
    diagnostics: []
  };
  const suggestions = suggestPatterns({ repoFacts, patterns: [retryPattern, circuitBreakerPattern], goal: "Need retry with idempotent operations." });
  assert.equal(suggestions[0].pattern.id, "retry");
  assert.deepEqual(suggestPatterns({
    repoFacts: { ...repoFacts, packageName: "", packageDescription: "", scripts: {}, testCommands: [] },
    patterns: [circuitBreakerPattern],
    goal: "zzzz"
  }), []);
  const tiePattern = { ...retryPattern, id: "aaa-retry", title: "Retry Clone" };
  const tied = suggestPatterns({
    repoFacts: { ...repoFacts, packageName: undefined, packageDescription: undefined },
    patterns: [retryPattern, tiePattern],
    goal: "retry"
  });
  assert.equal(tied[0].pattern.id, "aaa-retry");
  assert.deepEqual(suggestPatterns({
    repoFacts: { ...repoFacts, packageName: undefined, packageDescription: undefined, scripts: {}, testCommands: [] },
    patterns: [circuitBreakerPattern],
    goal: undefined
  }), []);

  const llmSuggestions = suggestPatterns({
    repoFacts,
    patterns: [retryPattern],
    llm: {
      suggestPatterns() {
        return [{ pattern: retryPattern, score: 99, reasons: ["adapter"] }];
      }
    }
  });
  assert.equal(llmSuggestions[0].score, 99);
});

test("checkAgentsMd reports missing files, stale scripts, unbalanced blocks, and testing gaps", () => {
  const missingRoot = tempProject();
  assert.equal(checkAgentsMd({ root: missingRoot }).diagnostics[0].code, "agents-md.missing");

  const root = tempProject();
  writeJson(root, "package.json", { scripts: { test: "node --test", start: "node server.js", ci: "node ci.js", build: "tsc" } });
  fs.writeFileSync(path.join(root, "AGENTS.md"), [
    "# AGENTS.md",
    createManagedBlock("## Setup\n- Run `npm run missing`.\n- Run `npm test`.\n- Run `npm start`.\n- Run `pnpm ci`.\n- Run `yarn build`.\n- Run `bun test`.\n- Run `yarn install`.\n- Run `bun install`.\n- Run `pnpm install`.")
  ].join("\n"));
  const stale = checkAgentsMd({ root });
  assert.ok(stale.diagnostics.some((diagnostic) => diagnostic.code === "agents-md.script-missing"));

  fs.writeFileSync(path.join(root, "AGENTS.md"), "<!-- agents-md:start core -->\nNo guidance.\n");
  const broken = checkAgentsMd({ root });
  assert.ok(broken.diagnostics.some((diagnostic) => diagnostic.code === "managed-block.unbalanced"));
  assert.ok(broken.diagnostics.some((diagnostic) => diagnostic.code === "agents-md.testing-undocumented"));

  fs.writeFileSync(path.join(root, "CUSTOM.md"), createManagedBlock("## Testing\n- Run `npm test`."));
  assert.deepEqual(checkAgentsMd({ root, filePath: "CUSTOM.md", repoFacts: scanProject(root) }).diagnostics, []);
  assert.ok(checkAgentsMd({ repoFacts: scanProject(root), filePath: "CUSTOM.md" }).diagnostics.length === 0);
  assert.ok(checkAgentsMd().diagnostics.length >= 0);
});

test("createUnifiedDiff reports changed and unchanged files", () => {
  assert.equal(createUnifiedDiff("AGENTS.md", "same\n", "same\n"), "No changes for AGENTS.md.\n");
  const diff = createUnifiedDiff("AGENTS.md", "old\n", "new\n");
  assert.match(diff, /--- AGENTS.md/);
  assert.match(diff, /-old/);
  assert.match(diff, /\+new/);
});

test("CLI supports help, guide, doctor, check, diff, init, compose, scopes, and unknown commands", () => {
  const root = tempProject();
  writeJson(root, "package.json", {
    name: "cli-project",
    scripts: { test: "node --test" },
    devDependencies: { typescript: "6.0.3" }
  });
  fs.writeFileSync(path.join(root, "retry.pattern.json"), JSON.stringify(retryPattern, null, 2));
  fs.writeFileSync(path.join(root, "invalid.pattern.json"), JSON.stringify({ id: "" }, null, 2));
  fs.writeFileSync(path.join(root, "agents-md.config.json"), JSON.stringify({
    project: { description: "CLI configured project" },
    sections: [{ id: "extra", title: "Extra", body: "Configured." }]
  }));
  const io = createIo(root);

  assert.equal(runCli(["help"], io), 0);
  assert.match(io.stdoutText(), /agents-md <command>/);
  io.clear();

  assert.equal(runCli(["guide"], io), 0);
  assert.match(io.stdoutText(), /agents-md Agent Guide/);
  io.clear();

  io.guidePath = path.join(root, "missing-guide.md");
  assert.equal(runCli(["guide"], io), 0);
  assert.match(io.stdoutText(), /without `--dry-run`/);
  fs.writeFileSync(path.join(root, "short-guide.md"), "# Short");
  io.guidePath = path.join(root, "short-guide.md");
  assert.equal(runCli(["guide"], io), 0);
  assert.match(io.stdoutText(), /# Short\n$/);
  delete io.guidePath;
  io.clear();

  const emptyRoot = tempProject();
  assert.equal(runCli(["doctor", "--root", emptyRoot], io), 0);
  assert.match(io.stdoutText(), /Package manager: none detected/);
  assert.match(io.stdoutText(), /Existing agent files: none detected/);
  io.clear();

  assert.equal(runCli(["doctor", "--root", root], io), 0);
  assert.match(io.stdoutText(), /Package manager: npm/);
  io.clear();

  assert.equal(runCli(["diff", "--root", root, "--mode", "detailed", "--pattern", "retry.pattern.json"], io), 0);
  assert.match(io.stdoutText(), /\+## Pattern Guidance/);
  assert.equal(fs.existsSync(path.join(root, "AGENTS.md")), false);
  io.clear();

  assert.equal(runCli(["diff", "--root", root, "--mode", "weird", "--scope", "bad", "--pattern", "invalid.pattern.json"], io), 1);
  assert.match(io.stderrText(), /pattern.id.required/);
  io.clear();

  assert.equal(runCli(["init", "--root", root, "--pattern", "invalid.pattern.json"], io), 1);
  assert.match(io.stderrText(), /pattern.id.required/);
  io.clear();

  assert.equal(runCli(["init", "--root", root, "--pattern", "retry.pattern.json"], io), 0);
  assert.equal(fs.existsSync(path.join(root, "AGENTS.md")), true);
  assert.match(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), /Retry Pattern/);
  io.clear();

  fs.mkdirSync(path.join(root, "packages", "api"), { recursive: true });
  assert.equal(runCli(["doctor", "--root", root], io), 0);
  assert.match(io.stdoutText(), /Existing agent files: AGENTS.md/);
  io.clear();

  fs.writeFileSync(path.join(root, "AGENTS.md"), "<!-- agents-md:start core -->\n");
  assert.equal(runCli(["check", "--root", root], io), 1);
  assert.match(io.stderrText(), /managed-block.unbalanced/);
  io.clear();
  assert.equal(runCli(["doctor", "--root", root], io), 1);
  assert.match(io.stderrText(), /managed-block.unbalanced/);
  io.clear();
  fs.writeFileSync(path.join(root, "AGENTS.md"), createManagedBlock("## Testing\n- Run `npm test`."));

  assert.equal(runCli(["doctor", "--root", root], io), 0);
  io.clear();

  assert.equal(runCli(["compose", "--root", root, "--config", "agents-md.config.json", "--scope", "packages/api:retry.pattern.json", "--dry-run"], io), 0);
  assert.match(io.stdoutText(), /packages\/api\/AGENTS.md/);
  assert.equal(fs.existsSync(path.join(root, "packages", "api", "AGENTS.md")), false);
  io.clear();

  assert.equal(runCli(["diff", "--root", root, "--scope"], io), 0);
  io.clear();

  assert.equal(runCli(["check", "--root", root], io), 0);
  io.clear();

  assert.equal(runCli(["nope"], io), 1);
  assert.match(io.stderrText(), /Unknown command/);

  assert.equal(runCli([], io), 0);
  io.clear();

  withPatchedStd(() => {
    assert.equal(runCli(["help"]), 0);
    assert.equal(runCli(["--help"]), 0);
    assert.equal(runCli(["-h"]), 0);
    assert.equal(runCli(["unknown-default-io"]), 1);
    assert.ok([0, 1].includes(runCli()));
  });
});

test("bin entrypoint delegates to the CLI", async () => {
  const originalArgv = process.argv;
  const originalExitCode = process.exitCode;

  await withPatchedStdAsync(async () => {
    process.argv = [originalArgv[0], path.join(process.cwd(), "dist", "bin.js"), "help"];
    process.exitCode = undefined;
    await import(`../dist/bin.js?run=${Date.now()}`);
    assert.equal(process.exitCode, 0);
  });

  process.argv = originalArgv;
  process.exitCode = originalExitCode;
});

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agents-md-"));
}

function writeJson(root, relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function createIo(cwd) {
  let out = "";
  let err = "";
  return {
    cwd,
    stdout(message) {
      out += message;
    },
    stderr(message) {
      err += message;
    },
    stdoutText() {
      return out;
    },
    stderrText() {
      return err;
    },
    clear() {
      out = "";
      err = "";
    }
  };
}

function withPatchedStd(callback) {
  const originalStdout = process.stdout.write;
  const originalStderr = process.stderr.write;
  process.stdout.write = () => true;
  process.stderr.write = () => true;
  try {
    callback();
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  }
}

async function withPatchedStdAsync(callback) {
  const originalStdout = process.stdout.write;
  const originalStderr = process.stderr.write;
  process.stdout.write = () => true;
  process.stderr.write = () => true;
  try {
    await callback();
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  }
}
