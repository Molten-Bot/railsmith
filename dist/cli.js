#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { checkAgentsMd } from "./check.js";
import { createUnifiedDiff } from "./diff.js";
import { generateAgentsMd } from "./generate.js";
import { mergeAgentsMd } from "./merge.js";
import { bundledPatterns, getBundledPattern } from "./patterns.js";
import { scanProject } from "./scan.js";
export function runCli(argv = process.argv.slice(2), io = defaultIo()) {
    const options = parseArgs(argv, io.cwd);
    if (options.command === "help" || options.command === "--help" || options.command === "-h") {
        io.stdout(usage());
        return 0;
    }
    if (!["init", "compose", "check", "doctor", "diff", "guide", "patterns"].includes(options.command)) {
        io.stderr(`Unknown command: ${options.command}\n\n${usage()}`);
        return 1;
    }
    if (options.command === "patterns") {
        return runPatterns(argv.slice(1), io);
    }
    if (options.command === "guide") {
        return runGuide(io);
    }
    if (options.command === "check") {
        return runCheck(options, io);
    }
    if (options.command === "doctor") {
        return runDoctor(options, io);
    }
    return runGenerateCommand(options, io, options.command === "diff" || options.dryRun);
}
function runGenerateCommand(options, io, dryRun) {
    const config = loadConfig(options.config, options.root);
    const repoFacts = scanProject(options.root);
    const configPatterns = config.patterns ?? [];
    const bundledSelections = loadBundledSelections(options.uses);
    printDiagnostics(bundledSelections.diagnostics, io);
    const patterns = [
        ...configPatterns,
        ...loadPatternSelections(options.patterns, options.root),
        ...bundledSelections.patterns
    ];
    const result = generateAgentsMd({
        ...config,
        root: options.root,
        repoFacts,
        mode: options.mode,
        patterns
    });
    printDiagnostics(result.diagnostics, io);
    for (const file of result.files) {
        const target = path.join(options.root, file.path);
        const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
        const merge = mergeAgentsMd({ existing, generated: file.content });
        printDiagnostics(merge.diagnostics, io);
        io.stdout(createUnifiedDiff(file.path, existing, merge.content));
        if (!dryRun && !hasError(merge.diagnostics)) {
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, merge.content);
        }
    }
    return hasError([...bundledSelections.diagnostics, ...result.diagnostics]) ? 1 : 0;
}
function runCheck(options, io) {
    const result = checkAgentsMd({ root: options.root });
    printDiagnostics(result.diagnostics, io);
    return hasError(result.diagnostics) ? 1 : 0;
}
function runDoctor(options, io) {
    const facts = scanProject(options.root);
    const check = checkAgentsMd({ root: options.root, repoFacts: facts });
    io.stdout([
        `Root: ${facts.root}`,
        `Package manager: ${facts.packageManager ?? "none detected"}`,
        `Frameworks: ${facts.frameworks.length > 0 ? facts.frameworks.join(", ") : "none detected"}`,
        `Package areas: ${facts.packageDirectories.length > 0 ? facts.packageDirectories.join(", ") : "none detected"}`,
        `Existing agent files: ${facts.existingAgentFiles.length > 0 ? facts.existingAgentFiles.join(", ") : "none detected"}`
    ].join("\n") + "\n");
    printDiagnostics(check.diagnostics, io);
    return hasError(check.diagnostics) ? 1 : 0;
}
function runGuide(io) {
    const guidePath = io.guidePath ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "AGENT_GUIDE.md");
    const guide = fs.existsSync(guidePath) ? fs.readFileSync(guidePath, "utf8") : fallbackGuide();
    io.stdout(guide.endsWith("\n") ? guide : `${guide}\n`);
    return 0;
}
function runPatterns(argv, io) {
    const subcommand = argv[0] ?? "list";
    if (subcommand !== "list") {
        io.stderr(`Unknown patterns command: ${subcommand}\n`);
        return 1;
    }
    for (const pattern of bundledPatterns) {
        io.stdout(`${pattern.id}\t${pattern.title}\n`);
    }
    return 0;
}
function parseArgs(argv, cwd) {
    const command = argv[0] ?? "help";
    const options = {
        command,
        root: cwd,
        mode: "standard",
        patterns: [],
        uses: [],
        dryRun: false
    };
    for (let index = 1; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--root") {
            options.root = path.resolve(cwd, argv[++index]);
        }
        else if (arg === "--mode") {
            options.mode = parseMode(argv[++index]);
        }
        else if (arg === "--config") {
            options.config = argv[++index];
        }
        else if (arg === "--pattern") {
            options.patterns.push({ path: argv[++index] });
        }
        else if (arg === "--scope") {
            const [scope, patternPath] = splitScopedValue(argv[++index] ?? "");
            if (scope && patternPath) {
                options.patterns.push({ scope, path: patternPath });
            }
        }
        else if (arg === "--use") {
            options.uses.push({ id: argv[++index] });
        }
        else if (arg === "--scope-use") {
            const [scope, id] = splitScopedValue(argv[++index] ?? "");
            if (scope && id) {
                options.uses.push({ scope, id });
            }
        }
        else if (arg === "--dry-run") {
            options.dryRun = true;
        }
    }
    return options;
}
function parseMode(value) {
    if (value === "compact" || value === "detailed") {
        return value;
    }
    return "standard";
}
function loadConfig(configPath, root) {
    if (!configPath) {
        return {};
    }
    const resolved = path.resolve(root, configPath);
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
}
function loadPatternSelections(patterns, root) {
    return patterns.map((item) => ({
        scope: item.scope,
        pattern: JSON.parse(fs.readFileSync(path.resolve(root, item.path), "utf8"))
    }));
}
function loadBundledSelections(uses) {
    const diagnostics = [];
    const patterns = [];
    for (const item of uses) {
        const pattern = getBundledPattern(item.id);
        if (!pattern) {
            diagnostics.push({
                severity: "error",
                code: "pattern.bundled.missing",
                message: `Bundled pattern "${item.id}" was not found. Run \`railsmith patterns list\` to inspect available ids.`
            });
            continue;
        }
        patterns.push({ pattern, scope: item.scope });
    }
    return { patterns, diagnostics };
}
function splitScopedValue(value) {
    const index = value.indexOf(":");
    if (index === -1) {
        return [undefined, undefined];
    }
    return [value.slice(0, index), value.slice(index + 1)];
}
function printDiagnostics(diagnostics, io) {
    for (const diagnostic of diagnostics) {
        const line = `[${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.message}`;
        if (diagnostic.severity === "error") {
            io.stderr(`${line}\n`);
        }
        else {
            io.stdout(`${line}\n`);
        }
    }
}
function hasError(diagnostics) {
    return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}
function usage() {
    return `railsmith <command> [options]

Commands:
  init       Scan a project and create or update managed AGENTS.md blocks.
  compose    Generate from config and optional pattern JSON files.
  diff       Print the changes that init/compose would write.
  check      Validate AGENTS.md markers and referenced package scripts.
  doctor     Print scan facts and validation diagnostics.
  guide      Print the agent-facing usage guide shipped with the package.
  patterns   List bundled pattern ids and titles.

Options:
  --root <dir>             Project root. Defaults to the current directory.
  --mode <mode>            compact, standard, or detailed.
  --config <file>          JSON GenerateConfig file.
  --pattern <file>         Pattern JSON file for root AGENTS.md.
  --scope <dir:file>       Pattern JSON file for a scoped nested AGENTS.md.
  --use <id>               Bundled pattern id for root AGENTS.md.
  --scope-use <dir:id>     Bundled pattern id for a scoped nested AGENTS.md.
  --dry-run                Print diffs without writing files.
`;
}
function defaultIo() {
    return {
        cwd: process.cwd(),
        stdout: (message) => process.stdout.write(message),
        stderr: (message) => process.stderr.write(message)
    };
}
function fallbackGuide() {
    return `# railsmith Agent Guide

Use \`railsmith init --dry-run\` to inspect proposed AGENTS.md changes, then rerun without \`--dry-run\` when the user approves. Preserve user-authored guidance and rely on managed blocks for repeatable updates.
`;
}
//# sourceMappingURL=cli.js.map