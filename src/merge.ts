import type { Diagnostic, MergeInput, MergeResult } from "./types.js";

export const DEFAULT_MANAGED_BLOCK = "core";

export function managedBlockStart(blockName = DEFAULT_MANAGED_BLOCK): string {
  return `<!-- railsmith:start ${blockName} -->`;
}

export function managedBlockEnd(blockName = DEFAULT_MANAGED_BLOCK): string {
  return `<!-- railsmith:end ${blockName} -->`;
}

export function createManagedBlock(body: string, blockName = DEFAULT_MANAGED_BLOCK): string {
  return `${managedBlockStart(blockName)}\n${body.trim()}\n${managedBlockEnd(blockName)}`;
}

export function extractManagedBlock(content: string, blockName = DEFAULT_MANAGED_BLOCK): string | undefined {
  const start = managedBlockStart(blockName);
  const end = managedBlockEnd(blockName);
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return undefined;
  }

  return content.slice(startIndex, endIndex + end.length);
}

export function managedBlockDiagnostics(content: string, blockName = DEFAULT_MANAGED_BLOCK, file?: string): Diagnostic[] {
  const start = managedBlockStart(blockName);
  const end = managedBlockEnd(blockName);
  const startCount = countOccurrences(content, start);
  const endCount = countOccurrences(content, end);
  const diagnostics: Diagnostic[] = [];

  if (startCount !== endCount) {
    diagnostics.push({
      severity: "error",
      code: "managed-block.unbalanced",
      message: `Managed block "${blockName}" has ${startCount} start marker(s) and ${endCount} end marker(s).`,
      file
    });
  }

  if (startCount > 1 || endCount > 1) {
    diagnostics.push({
      severity: "error",
      code: "managed-block.duplicate",
      message: `Managed block "${blockName}" appears more than once.`,
      file
    });
  }

  return diagnostics;
}

export function mergeAgentsMd(input: MergeInput): MergeResult {
  const blockName = input.blockName ?? DEFAULT_MANAGED_BLOCK;
  const strategy = input.strategy ?? "preserve-managed";
  const diagnostics: Diagnostic[] = [];

  if (strategy !== "preserve-managed") {
    return {
      content: input.existing ?? input.generated,
      changed: false,
      diagnostics: [{
        severity: "error",
        code: "merge.strategy.unsupported",
        message: `Unsupported merge strategy "${strategy}".`
      }]
    };
  }

  const existing = normalizeEnd(input.existing ?? "");
  const generated = normalizeEnd(input.generated);
  const generatedBlock = extractManagedBlock(generated, blockName) ?? createManagedBlock(generated, blockName);

  if (existing.trim().length === 0) {
    return { content: generated, changed: existing !== generated, diagnostics };
  }

  diagnostics.push(...managedBlockDiagnostics(existing, blockName));
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return { content: existing, changed: false, diagnostics };
  }

  const existingBlock = extractManagedBlock(existing, blockName);
  if (!existingBlock) {
    const content = `${existing.trimEnd()}\n\n${generatedBlock}\n`;
    return { content, changed: content !== existing, diagnostics };
  }

  const content = existing.replace(existingBlock, generatedBlock);
  return { content, changed: content !== existing, diagnostics };
}

function countOccurrences(content: string, needle: string): number {
  let count = 0;
  let index = content.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = content.indexOf(needle, index + needle.length);
  }
  return count;
}

function normalizeEnd(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}
