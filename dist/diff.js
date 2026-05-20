export function createUnifiedDiff(filePath, before, after) {
    if (before === after) {
        return `No changes for ${filePath}.\n`;
    }
    const beforeLines = before.split(/\r?\n/);
    const afterLines = after.split(/\r?\n/);
    const lines = [`--- ${filePath}`, `+++ ${filePath}`];
    const max = Math.max(beforeLines.length, afterLines.length);
    for (let index = 0; index < max; index += 1) {
        const left = beforeLines[index];
        const right = afterLines[index];
        if (left === right) {
            if (left !== undefined && left.length > 0) {
                lines.push(` ${left}`);
            }
            continue;
        }
        if (left !== undefined && left.length > 0) {
            lines.push(`-${left}`);
        }
        if (right !== undefined && right.length > 0) {
            lines.push(`+${right}`);
        }
    }
    return `${lines.join("\n")}\n`;
}
//# sourceMappingURL=diff.js.map