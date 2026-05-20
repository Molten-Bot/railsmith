import fs from "node:fs";
import path from "node:path";
import type { CheckInput, CheckResult, Diagnostic, RepoFacts } from "./types.js";
import { managedBlockDiagnostics } from "./merge.js";
import { scanProject } from "./scan.js";

export function checkAgentsMd(input: CheckInput = {}): CheckResult {
  const root = path.resolve(input.root ?? input.repoFacts?.root ?? ".");
  const repoFacts = input.repoFacts ?? scanProject(root);
  const relativeFile = input.filePath ?? "AGENTS.md";
  const filePath = path.join(root, relativeFile);
  const diagnostics: Diagnostic[] = [...repoFacts.diagnostics];

  if (!fs.existsSync(filePath)) {
    diagnostics.push({
      severity: "warning",
      code: "agents-md.missing",
      message: `${relativeFile} does not exist yet.`,
      file: relativeFile
    });
    return { diagnostics };
  }

  const content = fs.readFileSync(filePath, "utf8");
  diagnostics.push(...managedBlockDiagnostics(content, "core", relativeFile));
  diagnostics.push(...staleScriptDiagnostics(content, repoFacts, relativeFile));

  if (!/test/i.test(content)) {
    diagnostics.push({
      severity: "info",
      code: "agents-md.testing-undocumented",
      message: `${relativeFile} does not mention testing guidance.`,
      file: relativeFile
    });
  }

  return { diagnostics };
}

function staleScriptDiagnostics(content: string, repoFacts: RepoFacts, file: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const commands = commandMatches(content);

  for (const command of commands) {
    if (command.script && repoFacts.scripts[command.script] === undefined) {
      diagnostics.push({
        severity: "warning",
        code: "agents-md.script-missing",
        message: `Command \`${command.raw}\` references missing package script "${command.script}".`,
        file
      });
    }
  }

  return diagnostics;
}

function commandMatches(content: string): Array<{ raw: string; script?: string }> {
  const matches: Array<{ raw: string; script?: string }> = [];
  const regex = /`((?:npm|pnpm|yarn|bun)\s+(?:run\s+)?[a-zA-Z0-9:_-]+)`/g;
  let match = regex.exec(content);

  while (match) {
    const raw = match[1]!;
    matches.push({ raw, script: scriptName(raw) });
    match = regex.exec(content);
  }

  return matches;
}

function scriptName(command: string): string | undefined {
  const parts = command.split(/\s+/);
  const runner = parts[0];
  const second = parts[1];

  if (runner === "npm" && second === "run") {
    return parts[2];
  }

  if (runner === "npm" && second !== "install") {
    return second === "test" ? "test" : second;
  }

  if ((runner === "pnpm" || runner === "yarn" || runner === "bun") && second !== "install") {
    return second;
  }

  return undefined;
}
