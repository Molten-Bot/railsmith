#!/usr/bin/env node
interface CliIo {
    cwd: string;
    stdout: (message: string) => void;
    stderr: (message: string) => void;
    guidePath?: string;
}
export declare function runCli(argv?: any, io?: CliIo): number;
export {};
//# sourceMappingURL=cli.d.ts.map