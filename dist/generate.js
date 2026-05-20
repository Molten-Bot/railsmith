import path from "node:path";
import { createManagedBlock, DEFAULT_MANAGED_BLOCK } from "./merge.js";
import { findPatternConflicts, hasErrors, validatePattern } from "./validate.js";
export function generateAgentsMd(config = {}) {
    const mode = config.mode ?? "standard";
    const root = path.resolve(config.root ?? config.repoFacts?.root ?? ".");
    const blockName = config.output?.managedBlockName ?? DEFAULT_MANAGED_BLOCK;
    const scoped = config.output?.scoped ?? true;
    const repoFacts = config.repoFacts ?? emptyRepoFacts(root);
    const selections = normalizeSelections(config.patterns ?? []);
    const diagnostics = [...repoFacts.diagnostics];
    for (let index = 0; index < selections.length; index += 1) {
        diagnostics.push(...validatePattern(selections[index].pattern, index));
    }
    const validSelections = selections.filter((selection, index) => !hasErrors(validatePattern(selection.pattern, index)));
    diagnostics.push(...findPatternConflicts(validSelections.map((selection) => selection.pattern)));
    const rootSelections = validSelections.filter((selection) => !selection.scope || selection.scope === "." || selection.scope === "/");
    const scopedSelections = groupScopedSelections(validSelections.filter((selection) => selection.scope && selection.scope !== "." && selection.scope !== "/"));
    const rootFile = config.output?.rootFile ?? "AGENTS.md";
    const files = [{
            path: rootFile,
            content: renderRootFile({
                blockName,
                mode,
                repoFacts,
                project: config.project,
                sections: config.sections ?? [],
                patterns: rootSelections.map((selection) => selection.pattern),
                scopedFiles: scoped ? [...scopedSelections.keys()].map((scope) => `${scope}/AGENTS.md`) : []
            }),
            managed: true
        }];
    if (scoped) {
        for (const [scope, scopedPatterns] of scopedSelections) {
            files.push({
                path: `${scope}/AGENTS.md`,
                scope,
                managed: true,
                content: renderScopedFile(scope, scopedPatterns.map((selection) => selection.pattern), mode, blockName)
            });
        }
    }
    return {
        files,
        diagnostics,
        manifest: createManifest(root, mode, files, validSelections)
    };
}
function renderRootFile(input) {
    const title = "# AGENTS.md";
    const body = [
        renderProjectOverview(input.project, input.repoFacts, input.mode),
        renderSetup(input.repoFacts, input.mode),
        renderTesting(input.repoFacts, input.mode),
        renderCodeStyle(input.repoFacts, input.mode),
        renderArchitecture(input.patterns, input.scopedFiles, input.mode),
        renderSecurity(input.mode),
        renderPullRequests(input.mode),
        ...input.sections.map(renderCustomSection),
        renderPatternSection(input.patterns, input.mode)
    ].filter(Boolean).join("\n\n");
    return `${title}\n\n${createManagedBlock(body, input.blockName)}\n`;
}
function renderScopedFile(scope, patterns, mode, blockName) {
    const body = [
        `## Scope\nThese instructions apply to files under \`${scope}\`. Keep this file focused on local guardrails that are more specific than the repository root.`,
        renderPatternSection(patterns, mode)
    ].filter(Boolean).join("\n\n");
    return `# AGENTS.md\n\n${createManagedBlock(body, blockName)}\n`;
}
function renderProjectOverview(project, facts, mode) {
    const name = project?.name ?? facts.packageName;
    const description = project?.description ?? facts.packageDescription;
    const items = [];
    if (name) {
        items.push(`Project name: ${name}.`);
    }
    if (description) {
        items.push(`Purpose: ${description}.`);
    }
    if (facts.frameworks.length > 0) {
        items.push(`Detected stack: ${facts.frameworks.join(", ")}.`);
    }
    if (facts.packageDirectories.length > 0 && mode !== "compact") {
        items.push(`Workspace areas: ${facts.packageDirectories.map((directory) => `\`${directory}\``).join(", ")}.`);
    }
    if (items.length === 0) {
        items.push("Keep project guidance current as architecture, commands, and ownership change.");
    }
    return section("Project Overview", items);
}
function renderSetup(facts, mode) {
    const items = [];
    if (facts.packageManager) {
        items.push(`Install dependencies with \`${installCommand(facts.packageManager)}\`.`);
    }
    for (const script of preferredScripts(facts.scripts, ["dev", "start", "build"])) {
        items.push(`Run \`${scriptCommand(facts.packageManager ?? "npm", script)}\` for \`${script}\`.`);
    }
    if (facts.ciFiles.length > 0 && mode === "detailed") {
        items.push(`Check CI workflow definitions in ${facts.ciFiles.map((file) => `\`${file}\``).join(", ")}.`);
    }
    if (items.length === 0) {
        items.push("Document install, build, and local run commands before relying on agent automation.");
    }
    return section("Setup Commands", items);
}
function renderTesting(facts, mode) {
    const items = facts.testCommands.map((command) => `Run \`${command}\` before finishing changes that affect behavior.`);
    if (items.length === 0) {
        items.push("No test command was detected; add or document one before treating automated changes as complete.");
    }
    if (mode !== "compact") {
        items.push("Add or update focused tests for the behavior being changed.");
    }
    return section("Testing Instructions", items);
}
function renderCodeStyle(facts, mode) {
    const items = [];
    if (facts.frameworks.includes("typescript")) {
        items.push("Prefer typed TypeScript APIs and avoid weakening existing type safety.");
    }
    if (facts.frameworks.includes("eslint")) {
        items.push("Follow the repository ESLint rules instead of introducing local style exceptions.");
    }
    if (mode === "detailed") {
        items.push("Match nearby naming, file layout, and error-handling conventions before adding new abstractions.");
    }
    if (items.length === 0) {
        items.push("Match the style and structure of the code around the change.");
    }
    return section("Code Style", items);
}
function renderArchitecture(patterns, scopedFiles, mode) {
    const items = [
        "Treat this file as guardrails for agents, not as a replacement for human design review.",
        "Do not force a pattern when the applicability gate does not fit the requested work."
    ];
    if (patterns.length > 0) {
        items.push(`Approved root patterns: ${patterns.map((pattern) => pattern.title).join(", ")}.`);
    }
    if (scopedFiles.length > 0) {
        items.push(`More specific instructions live in ${scopedFiles.map((file) => `\`${file}\``).join(", ")}.`);
    }
    if (mode !== "compact") {
        items.push("When patterns interact, name the primary pattern and keep supporting patterns bounded.");
    }
    return section("Architecture Guardrails", items);
}
function renderSecurity(mode) {
    const items = [
        "Do not commit secrets, tokens, private keys, or generated credentials.",
        "Keep authentication, authorization, validation, and audit behavior explicit in security-sensitive paths."
    ];
    if (mode === "detailed") {
        items.push("Prefer platform secret stores and documented environment variables over hard-coded configuration.");
    }
    return section("Security Considerations", items);
}
function renderPullRequests(mode) {
    const items = [
        "Summarize behavior changes, tests run, and any remaining risk.",
        "Call out intentional pattern trade-offs or guardrail exceptions in the PR notes."
    ];
    if (mode === "compact") {
        return section("PR Expectations", items.slice(0, 1));
    }
    return section("PR Expectations", items);
}
function renderCustomSection(input) {
    const body = [
        input.body?.trim(),
        input.items && input.items.length > 0 ? bullets(input.items) : undefined
    ].filter(Boolean).join("\n\n");
    return `## ${input.title}\n${body}`;
}
function renderPatternSection(patterns, mode) {
    if (patterns.length === 0) {
        return "";
    }
    return `## Pattern Guidance\n${patterns.map((pattern) => renderPattern(pattern, mode)).join("\n\n")}`;
}
function renderPattern(pattern, mode) {
    const parts = [
        `### ${pattern.title}`,
        `Intent: ${pattern.intent}`,
        listBlock("Apply When", pattern.applyWhen),
        listBlock("Do Not Force It When", pattern.doNotUseWhen)
    ];
    if (mode !== "compact") {
        parts.push(listBlock("Architecture Invariants", pattern.invariants ?? []));
        parts.push(listBlock("Verification Checklist", pattern.verification ?? []));
        parts.push(sourceBlock(pattern.sources ?? []));
    }
    if (mode === "detailed") {
        parts.push(`#### Source Guidance\n${normalizePatternMarkdown(pattern.markdown)}`);
    }
    return parts.filter(Boolean).join("\n\n");
}
function listBlock(title, items) {
    if (items.length === 0) {
        return "";
    }
    return `#### ${title}\n${bullets(items)}`;
}
function sourceBlock(sources) {
    if (sources.length === 0) {
        return "";
    }
    return `#### Sources\n${bullets(sources)}`;
}
function section(title, items) {
    return `## ${title}\n${bullets(items)}`;
}
function bullets(items) {
    return items.map((item) => `- ${item}`).join("\n");
}
function preferredScripts(scripts, names) {
    return names.filter((name) => scripts[name] !== undefined);
}
function installCommand(packageManager) {
    if (packageManager === "yarn") {
        return "yarn install";
    }
    if (packageManager === "bun") {
        return "bun install";
    }
    return `${packageManager} install`;
}
function scriptCommand(packageManager, scriptName) {
    if (packageManager === "npm") {
        return scriptName === "start" ? "npm start" : `npm run ${scriptName}`;
    }
    return `${packageManager} ${scriptName}`;
}
function normalizePatternMarkdown(markdown) {
    return markdown
        .trim()
        .split(/\r?\n/)
        .map((line) => line.startsWith("#") ? `#${line}` : line)
        .join("\n");
}
function normalizeSelections(inputs) {
    return inputs.map((input) => {
        if ("pattern" in input) {
            return { pattern: input.pattern, scope: normalizeScope(input.scope) };
        }
        return { pattern: input };
    });
}
function normalizeScope(scope) {
    if (!scope) {
        return undefined;
    }
    return scope.replace(/^\/+|\/+$/g, "");
}
function groupScopedSelections(selections) {
    const grouped = new Map();
    for (const selection of selections) {
        const scope = selection.scope;
        if (!scope) {
            continue;
        }
        const existing = grouped.get(scope) ?? [];
        existing.push(selection);
        grouped.set(scope, existing);
    }
    return grouped;
}
function createManifest(root, mode, files, selections) {
    return {
        version: 1,
        root,
        mode,
        files: files.map((file) => ({
            path: file.path,
            scope: file.scope,
            patterns: selections
                .filter((selection) => (file.scope ? selection.scope === file.scope : !selection.scope || selection.scope === "." || selection.scope === "/"))
                .map((selection) => selection.pattern.id)
        })),
        patterns: selections.map((selection) => selection.pattern.id)
    };
}
function emptyRepoFacts(root) {
    return {
        root,
        scripts: {},
        dependencies: {},
        devDependencies: {},
        frameworks: [],
        testCommands: [],
        workspaces: [],
        packageDirectories: [],
        ciFiles: [],
        existingAgentFiles: [],
        nestedAgentsMd: [],
        toolFiles: [],
        diagnostics: []
    };
}
//# sourceMappingURL=generate.js.map