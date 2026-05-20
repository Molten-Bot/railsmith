export const DEFAULT_MANAGED_BLOCK = "core";
export function managedBlockStart(blockName = DEFAULT_MANAGED_BLOCK) {
    return `<!-- agents-md:start ${blockName} -->`;
}
export function managedBlockEnd(blockName = DEFAULT_MANAGED_BLOCK) {
    return `<!-- agents-md:end ${blockName} -->`;
}
export function createManagedBlock(body, blockName = DEFAULT_MANAGED_BLOCK) {
    return `${managedBlockStart(blockName)}\n${body.trim()}\n${managedBlockEnd(blockName)}`;
}
export function extractManagedBlock(content, blockName = DEFAULT_MANAGED_BLOCK) {
    const start = managedBlockStart(blockName);
    const end = managedBlockEnd(blockName);
    const startIndex = content.indexOf(start);
    const endIndex = content.indexOf(end);
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        return undefined;
    }
    return content.slice(startIndex, endIndex + end.length);
}
export function managedBlockDiagnostics(content, blockName = DEFAULT_MANAGED_BLOCK, file) {
    const start = managedBlockStart(blockName);
    const end = managedBlockEnd(blockName);
    const startCount = countOccurrences(content, start);
    const endCount = countOccurrences(content, end);
    const diagnostics = [];
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
export function mergeAgentsMd(input) {
    const blockName = input.blockName ?? DEFAULT_MANAGED_BLOCK;
    const strategy = input.strategy ?? "preserve-managed";
    const diagnostics = [];
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
function countOccurrences(content, needle) {
    let count = 0;
    let index = content.indexOf(needle);
    while (index !== -1) {
        count += 1;
        index = content.indexOf(needle, index + needle.length);
    }
    return count;
}
function normalizeEnd(content) {
    return content.endsWith("\n") ? content : `${content}\n`;
}
//# sourceMappingURL=merge.js.map