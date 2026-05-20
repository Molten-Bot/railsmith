import type { AgentPattern } from "./types.js";

export interface LearnPatternOptions {
  includeSourceGuidance?: boolean;
}

export function renderPatternLearning(pattern: AgentPattern, options: LearnPatternOptions = {}): string {
  const includeSourceGuidance = options.includeSourceGuidance ?? true;
  const blocks = [
    `# ${pattern.title}`,
    `Pattern id: \`${pattern.id}\``,
    textSection("Intent", pattern.intent),
    listSection("Apply When", pattern.applyWhen),
    listSection("Do Not Use When", pattern.doNotUseWhen),
    listSection("Architecture Invariants", pattern.invariants ?? []),
    listSection("Verification Checklist", pattern.verification ?? []),
    sourceSection(pattern.sources ?? []),
    includeSourceGuidance ? textSection("Full Pattern Contract", nestMarkdown(pattern.markdown)) : ""
  ];

  return `${blocks.filter(Boolean).join("\n\n")}\n`;
}

function textSection(title: string, body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return "";
  }

  return `## ${title}\n${trimmed}`;
}

function listSection(title: string, items: string[]): string {
  if (items.length === 0) {
    return "";
  }

  return `## ${title}\n${items.map((item) => `- ${item}`).join("\n")}`;
}

function sourceSection(sources: string[]): string {
  if (sources.length === 0) {
    return "";
  }

  return listSection("Sources", sources);
}

function nestMarkdown(markdown: string): string {
  return markdown
    .trim()
    .split(/\r?\n/)
    .map((line) => line.startsWith("#") ? `##${line}` : line)
    .join("\n");
}
