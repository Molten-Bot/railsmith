import type { AgentPattern, Diagnostic } from "./types.js";
export declare function validatePattern(pattern: Partial<AgentPattern>, index?: number): Diagnostic[];
export declare function findPatternConflicts(patterns: AgentPattern[]): Diagnostic[];
export declare function hasErrors(diagnostics: Diagnostic[]): boolean;
//# sourceMappingURL=validate.d.ts.map