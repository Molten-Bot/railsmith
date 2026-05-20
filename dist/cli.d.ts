#!/usr/bin/env node
export interface CliIo {
    cwd: string;
    stdout: (message: string) => void;
    stderr: (message: string) => void;
    guidePath?: string;
}
export declare function runCli(argv?: string[], io?: CliIo): number;
//# sourceMappingURL=cli.d.ts.map