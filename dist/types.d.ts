export type DiagnosticSeverity = "info" | "warning" | "error";
export interface Diagnostic {
    severity: DiagnosticSeverity;
    code: string;
    message: string;
    file?: string;
    details?: string[];
}
export interface AgentPattern {
    id: string;
    title: string;
    intent: string;
    applyWhen: string[];
    doNotUseWhen: string[];
    invariants?: string[];
    verification?: string[];
    markdown: string;
    sources?: string[];
}
export interface PatternSelection {
    pattern: AgentPattern;
    scope?: string;
}
export interface ProjectInfo {
    name?: string;
    description?: string;
}
export interface SectionInput {
    id: string;
    title: string;
    body?: string;
    items?: string[];
}
export type OutputMode = "compact" | "standard" | "detailed";
export interface RepoFacts {
    root: string;
    packageManager?: "npm" | "pnpm" | "yarn" | "bun";
    packageName?: string;
    packageDescription?: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    frameworks: string[];
    testCommands: string[];
    workspaces: string[];
    packageDirectories: string[];
    ciFiles: string[];
    existingAgentFiles: string[];
    nestedAgentsMd: string[];
    toolFiles: string[];
    diagnostics: Diagnostic[];
}
export interface GenerateConfig {
    root?: string;
    project?: ProjectInfo;
    repoFacts?: RepoFacts;
    sections?: SectionInput[];
    patterns?: Array<AgentPattern | PatternSelection>;
    mode?: OutputMode;
    output?: {
        rootFile?: string;
        scoped?: boolean;
        managedBlockName?: string;
    };
}
export interface GeneratedFile {
    path: string;
    content: string;
    managed: boolean;
    scope?: string;
}
export interface AgentsManifest {
    version: 1;
    root: string;
    mode: OutputMode;
    files: Array<{
        path: string;
        scope?: string;
        patterns: string[];
    }>;
    patterns: string[];
}
export interface GenerateResult {
    files: GeneratedFile[];
    diagnostics: Diagnostic[];
    manifest: AgentsManifest;
}
export interface MergeInput {
    existing?: string;
    generated: string;
    blockName?: string;
    strategy?: "preserve-managed";
}
export interface MergeResult {
    content: string;
    changed: boolean;
    diagnostics: Diagnostic[];
}
export interface PatternSuggestion {
    pattern: AgentPattern;
    score: number;
    reasons: string[];
    scope?: string;
}
export interface PatternSuggestionProvider {
    suggestPatterns(input: {
        repoFacts: RepoFacts;
        patterns: AgentPattern[];
        goal?: string;
    }): PatternSuggestion[];
}
export interface SuggestPatternsInput {
    repoFacts: RepoFacts;
    patterns: AgentPattern[];
    goal?: string;
    llm?: PatternSuggestionProvider;
}
export interface CheckInput {
    root?: string;
    repoFacts?: RepoFacts;
    filePath?: string;
}
export interface CheckResult {
    diagnostics: Diagnostic[];
}
//# sourceMappingURL=types.d.ts.map