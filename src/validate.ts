import type { AgentPattern, Diagnostic } from "./types.js";

export function validatePattern(pattern: Partial<AgentPattern>, index = 0): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const label = typeof pattern.id === "string" && pattern.id ? pattern.id : `pattern[${index}]`;

  if (!isNonEmptyString(pattern.id)) {
    diagnostics.push(error("pattern.id.required", `${label} is missing a non-empty id.`));
  }

  if (!isNonEmptyString(pattern.title)) {
    diagnostics.push(error("pattern.title.required", `${label} is missing a non-empty title.`));
  }

  if (!isNonEmptyString(pattern.intent)) {
    diagnostics.push(error("pattern.intent.required", `${label} is missing a non-empty intent.`));
  }

  if (!isStringArray(pattern.applyWhen) || pattern.applyWhen.length === 0) {
    diagnostics.push(error("pattern.applyWhen.required", `${label} must define at least one applyWhen guard.`));
  }

  if (!isStringArray(pattern.doNotUseWhen) || pattern.doNotUseWhen.length === 0) {
    diagnostics.push(error("pattern.doNotUseWhen.required", `${label} must define at least one doNotUseWhen guard.`));
  }

  if (!isNonEmptyString(pattern.markdown)) {
    diagnostics.push(error("pattern.markdown.required", `${label} is missing markdown guidance.`));
  }

  if (pattern.invariants !== undefined && !isStringArray(pattern.invariants)) {
    diagnostics.push(error("pattern.invariants.invalid", `${label} invariants must be an array of strings.`));
  }

  if (pattern.verification !== undefined && !isStringArray(pattern.verification)) {
    diagnostics.push(error("pattern.verification.invalid", `${label} verification must be an array of strings.`));
  }

  if (pattern.sources !== undefined && !isStringArray(pattern.sources)) {
    diagnostics.push(error("pattern.sources.invalid", `${label} sources must be an array of strings.`));
  }

  return diagnostics;
}

export function findPatternConflicts(patterns: AgentPattern[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const seen = new Map<string, AgentPattern>();

  for (const pattern of patterns) {
    const existing = seen.get(pattern.id);
    if (existing) {
      diagnostics.push({
        severity: "error",
        code: "pattern.id.duplicate",
        message: `Pattern id "${pattern.id}" is defined more than once.`,
        details: [existing.title, pattern.title]
      });
    }
    seen.set(pattern.id, pattern);
  }

  for (const left of patterns) {
    for (const right of patterns) {
      if (left.id === right.id) {
        continue;
      }

      const blocker = left.doNotUseWhen.find((line) => mentionsPattern(line, right));
      if (blocker) {
        diagnostics.push({
          severity: "warning",
          code: "pattern.conflict.possible",
          message: `${left.title} may conflict with ${right.title}.`,
          details: [blocker]
        });
      }
    }
  }

  return diagnostics;
}

export function hasErrors(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function mentionsPattern(line: string, pattern: AgentPattern): boolean {
  const haystack = line.toLowerCase();
  return haystack.includes(pattern.id.toLowerCase()) || haystack.includes(pattern.title.toLowerCase());
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function error(code: string, message: string): Diagnostic {
  return { severity: "error", code, message };
}
