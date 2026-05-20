import fs from "node:fs";
import path from "node:path";
const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "coverage", ".next", ".turbo"]);
export function scanProject(root = ".") {
    const absoluteRoot = path.resolve(root);
    const diagnostics = [];
    const packageJson = readJson(path.join(absoluteRoot, "package.json"), diagnostics);
    const scripts = objectRecord(packageJson?.scripts);
    const dependencies = objectRecord(packageJson?.dependencies);
    const devDependencies = objectRecord(packageJson?.devDependencies);
    const packageManager = detectPackageManager(absoluteRoot, packageJson?.packageManager);
    const workspaces = detectWorkspaces(absoluteRoot, packageJson);
    const allAgentFiles = findFiles(absoluteRoot, "AGENTS.md");
    return {
        root: absoluteRoot,
        packageManager,
        packageName: stringValue(packageJson?.name),
        packageDescription: stringValue(packageJson?.description),
        scripts,
        dependencies,
        devDependencies,
        frameworks: detectFrameworks({ ...dependencies, ...devDependencies }),
        testCommands: detectTestCommands(packageManager ?? "npm", scripts),
        workspaces,
        packageDirectories: detectPackageDirectories(absoluteRoot, workspaces),
        ciFiles: detectCiFiles(absoluteRoot),
        existingAgentFiles: allAgentFiles,
        nestedAgentsMd: allAgentFiles.filter((file) => file !== "AGENTS.md"),
        toolFiles: detectToolFiles(absoluteRoot),
        diagnostics
    };
}
function readJson(filePath, diagnostics) {
    if (!fs.existsSync(filePath)) {
        return undefined;
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    catch (error) {
        diagnostics.push({
            severity: "error",
            code: "json.invalid",
            message: `Could not parse ${path.basename(filePath)}.`,
            file: filePath,
            details: [String(error)]
        });
        return undefined;
    }
}
function detectPackageManager(root, declared) {
    if (typeof declared === "string") {
        const name = declared.split("@")[0];
        if (name === "pnpm" || name === "yarn" || name === "bun" || name === "npm") {
            return name;
        }
    }
    if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) {
        return "pnpm";
    }
    if (fs.existsSync(path.join(root, "yarn.lock"))) {
        return "yarn";
    }
    if (fs.existsSync(path.join(root, "bun.lock")) || fs.existsSync(path.join(root, "bun.lockb"))) {
        return "bun";
    }
    if (fs.existsSync(path.join(root, "package-lock.json")) || fs.existsSync(path.join(root, "package.json"))) {
        return "npm";
    }
    return undefined;
}
function detectWorkspaces(root, packageJson) {
    const declared = packageJson?.workspaces;
    if (Array.isArray(declared)) {
        return declared.filter((item) => typeof item === "string");
    }
    if (Array.isArray(declared?.packages)) {
        return declared.packages.filter((item) => typeof item === "string");
    }
    const pnpmWorkspace = path.join(root, "pnpm-workspace.yaml");
    if (!fs.existsSync(pnpmWorkspace)) {
        return [];
    }
    return fs.readFileSync(pnpmWorkspace, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2).replace(/^["']|["']$/g, ""));
}
function detectPackageDirectories(root, workspaces) {
    const patterns = workspaces.length > 0 ? workspaces : ["apps/*", "packages/*", "services/*"];
    const directories = new Set();
    for (const pattern of patterns) {
        if (!pattern.endsWith("/*")) {
            continue;
        }
        const parent = pattern.slice(0, -2);
        const parentPath = path.join(root, parent);
        if (!fs.existsSync(parentPath)) {
            continue;
        }
        for (const entry of fs.readdirSync(parentPath, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                directories.add(toPosix(path.join(parent, entry.name)));
            }
        }
    }
    return [...directories].sort();
}
function detectFrameworks(deps) {
    const frameworkMap = {
        react: ["react"],
        next: ["next"],
        vite: ["vite"],
        vue: ["vue"],
        svelte: ["svelte", "@sveltejs/kit"],
        astro: ["astro"],
        express: ["express"],
        fastify: ["fastify"],
        hono: ["hono"],
        nestjs: ["@nestjs/core"],
        typescript: ["typescript"],
        eslint: ["eslint"],
        vitest: ["vitest"],
        jest: ["jest"],
        playwright: ["@playwright/test", "playwright"],
        tailwind: ["tailwindcss"]
    };
    const names = new Set();
    for (const [framework, packages] of Object.entries(frameworkMap)) {
        if (packages.some((name) => deps[name] !== undefined)) {
            names.add(framework);
        }
    }
    return [...names].sort();
}
function detectTestCommands(packageManager, scripts) {
    const commands = [];
    const runner = packageManager === "yarn" ? "yarn" : packageManager;
    for (const scriptName of Object.keys(scripts).sort()) {
        if (scriptName === "test" || scriptName.startsWith("test:")) {
            commands.push(scriptCommand(runner, scriptName));
        }
    }
    return commands;
}
function scriptCommand(packageManager, scriptName) {
    if (packageManager === "npm") {
        return scriptName === "test" ? "npm test" : `npm run ${scriptName}`;
    }
    return `${packageManager} ${scriptName}`;
}
function detectCiFiles(root) {
    const files = [
        ".gitlab-ci.yml",
        "azure-pipelines.yml",
        "bitbucket-pipelines.yml",
        ".circleci/config.yml"
    ].filter((file) => fs.existsSync(path.join(root, file)));
    const workflows = path.join(root, ".github", "workflows");
    if (fs.existsSync(workflows)) {
        for (const entry of fs.readdirSync(workflows, { withFileTypes: true })) {
            if (entry.isFile() && /\.(ya?ml)$/i.test(entry.name)) {
                files.push(toPosix(path.join(".github", "workflows", entry.name)));
            }
        }
    }
    return files.sort();
}
function detectToolFiles(root) {
    const candidates = [
        "CLAUDE.md",
        "GEMINI.md",
        ".github/copilot-instructions.md",
        ".aider.conf.yml",
        ".cursor/rules"
    ];
    return candidates.filter((file) => fs.existsSync(path.join(root, file)));
}
function findFiles(root, fileName) {
    const results = [];
    visit(root, "");
    return results.sort();
    function visit(directory, relative) {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                if (!IGNORED_DIRS.has(entry.name)) {
                    visit(path.join(directory, entry.name), path.join(relative, entry.name));
                }
                continue;
            }
            if (entry.isFile() && entry.name === fileName) {
                results.push(toPosix(path.join(relative, entry.name)));
            }
        }
    }
}
function objectRecord(value) {
    if (!value || typeof value !== "object") {
        return {};
    }
    const record = {};
    for (const [key, item] of Object.entries(value)) {
        if (typeof item === "string") {
            record[key] = item;
        }
    }
    return record;
}
function stringValue(value) {
    return typeof value === "string" && value.trim() ? value : undefined;
}
function toPosix(filePath) {
    return filePath.split(path.sep).join("/");
}
//# sourceMappingURL=scan.js.map