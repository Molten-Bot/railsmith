#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkAgentsMd } from "./check.js";
import { createUnifiedDiff } from "./diff.js";
import { generateAgentsMd } from "./generate.js";
import { mergeAgentsMd } from "./merge.js";
import { scanProject } from "./scan.js";
export function runCli(argv = process.argv.slice(2), io = defaultIo()) {
    const options = parseArgs(argv, io.cwd);
    if (options.command === "help" || options.command === "--help" || options.command === "-h") {
        io.stdout(usage());
        return 0;
    }
    if (!["init", "compose", "check", "doctor", "diff", "guide"].includes(options.command)) {
        io.stderr(`Unknown command: ${options.command}\n\n${usage()}`);
        return 1;
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
    const patterns = [...configPatterns, ...loadPatternSelections(options.patterns, options.root)];
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
        if (!dryRun && merge.diagnostics.every((diagnostic) => diagnostic.severity !== "error")) {
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, merge.content);
        }
    }
    return hasError(result.diagnostics) ? 1 : 0;
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
    const guidePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "AGENT_GUIDE.md");
    const guide = fs.existsSync(guidePath) ? fs.readFileSync(guidePath, "utf8") : fallbackGuide();
    io.stdout(guide.endsWith("\n") ? guide : `${guide}\n`);
    return 0;
}
function parseArgs(argv, cwd) {
    const command = argv[0] ?? "help";
    const options = {
        command,
        root: cwd,
        mode: "standard",
        patterns: [],
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
            const [scope, patternPath] = (argv[++index] ?? "").split(":", 2);
            if (scope && patternPath) {
                options.patterns.push({ scope, path: patternPath });
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
    return `agents-md <command> [options]

Commands:
  init       Scan a project and create or update managed AGENTS.md blocks.
  compose    Generate from config and optional pattern JSON files.
  diff       Print the changes that init/compose would write.
  check      Validate AGENTS.md markers and referenced package scripts.
  doctor     Print scan facts and validation diagnostics.
  guide      Print the agent-facing usage guide shipped with the package.

Options:
  --root <dir>             Project root. Defaults to the current directory.
  --mode <mode>            compact, standard, or detailed.
  --config <file>          JSON GenerateConfig file.
  --pattern <file>         Pattern JSON file for root AGENTS.md.
  --scope <dir:file>       Pattern JSON file for a scoped nested AGENTS.md.
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
function isDirectRun(metaUrl, argvPath) {
    return argvPath !== undefined && metaUrl === pathToFileURL(argvPath).href;
}
function fallbackGuide() {
    return `# agents-md Agent Guide

Use \`agents-md init --dry-run\` to inspect proposed AGENTS.md changes, then rerun without \`--dry-run\` when the user approves. Preserve user-authored guidance and rely on managed blocks for repeatable updates.
`;
}
if (isDirectRun(import.meta.url, process.argv[1])) {
    process.exitCode = runCli();
}
//# sourceMappingURL=cli.js.map