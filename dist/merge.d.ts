import type { Diagnostic, MergeInput, MergeResult } from "./types.js";
export declare const DEFAULT_MANAGED_BLOCK = "core";
export declare function managedBlockStart(blockName?: string): string;
export declare function managedBlockEnd(blockName?: string): string;
export declare function createManagedBlock(body: string, blockName?: string): string;
export declare function extractManagedBlock(content: string, blockName?: string): string | undefined;
export declare function managedBlockDiagnostics(content: string, blockName?: string, file?: string): Diagnostic[];
export declare function mergeAgentsMd(input: MergeInput): MergeResult;
//# sourceMappingURL=merge.d.ts.map