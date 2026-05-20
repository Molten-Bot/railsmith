#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const generatedDir = path.join(root, "src", "generated");
const patternsDir = path.join(root, "patterns");

const repos = [
  {
    pack: "cloud",
    owner: "jefking",
    repo: "cloud-patterns",
    ref: process.env.AGENTS_MD_CLOUD_PATTERNS_REF ?? "main"
  },
  {
    pack: "design",
    owner: "jefking",
    repo: "design-patterns",
    ref: process.env.AGENTS_MD_DESIGN_PATTERNS_REF ?? "main"
  }
];

const syncedAt = new Date().toISOString();
const allPatterns = [];
const manifestPacks = [];

for (const repo of repos) {
  const tree = await fetchTree(repo);
  const agentFiles = tree
    .filter((item) => item.type === "blob" && item.path.endsWith("/AGENTS.md"))
    .sort((left, right) => left.path.localeCompare(right.path));
  const patterns = [];

  fs.rmSync(path.join(patternsDir, repo.pack), { recursive: true, force: true });
  fs.mkdirSync(path.join(patternsDir, repo.pack), { recursive: true });

  for (const file of agentFiles) {
    const markdown = await fetchRaw(repo, file.path);
    const pattern = markdownToPattern(repo.pack, file.path, markdown);
    const outputPath = path.join(patternsDir, repo.pack, `${fileNameForPattern(pattern.id)}.json`);

    fs.writeFileSync(outputPath, `${JSON.stringify(pattern, null, 2)}\n`);
    patterns.push(pattern);
    allPatterns.push(pattern);
  }

  manifestPacks.push({
    pack: repo.pack,
    source: `https://github.com/${repo.owner}/${repo.repo}`,
    ref: repo.ref,
    count: patterns.length,
    patterns: patterns.map((pattern) => pattern.id)
  });

  console.log(`Synced ${patterns.length} ${repo.pack} patterns from ${repo.owner}/${repo.repo}@${repo.ref}.`);
}

const manifest = {
  version: 1,
  syncedAt,
  packs: manifestPacks
};

fs.writeFileSync(path.join(patternsDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(path.join(generatedDir, "patterns.ts"), renderPatternsModule(manifest, allPatterns));

function markdownToPattern(pack, filePath, markdown) {
  const title = cleanTitle(extractTitle(markdown) ?? titleFromPath(filePath));
  const id = `${pack}:${idFromPath(pack, filePath)}`;
  const sources = extractUrls(markdown);
  const intent = firstNonEmpty([
    sectionText(markdown, ["Pattern Intent", "Intent"]),
    firstParagraph(markdown),
    title
  ]);

  return {
    id,
    title,
    intent,
    applyWhen: firstNonEmptyArray([
      sectionBullets(markdown, ["Apply When"]),
      useOnlyWhenBullets(markdown),
      sectionBullets(markdown, ["Applicability Gate"])
    ]),
    doNotUseWhen: firstNonEmptyArray([
      sectionBullets(markdown, ["Do Not Force It When", "Do Not Use When"]),
      doNotUseBullets(markdown),
      [`The ${title} applicability gate does not fit the requested work.`]
    ]),
    invariants: sectionBullets(markdown, ["Architecture Invariants"]),
    verification: sectionBullets(markdown, ["Verification Checklist", "Review Checklist"]),
    markdown: markdown.trim(),
    sources
  };
}

async function fetchTree(repo) {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(repo.ref)}?recursive=1`;
  const body = await fetchJson(url);
  if (!Array.isArray(body.tree)) {
    throw new Error(`GitHub tree response for ${repo.owner}/${repo.repo} did not include a tree array.`);
  }
  return body.tree;
}

async function fetchRaw(repo, filePath) {
  const url = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.ref}/${filePath}`;
  const response = await fetch(url, { headers: githubHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: githubHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function githubHeaders() {
  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "railsmith-pattern-sync"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

function cleanTitle(title) {
  return title
    .replace(/\s+Agents?$/i, "")
    .replace(/\s+Pattern$/i, " Pattern")
    .trim();
}

function titleFromPath(filePath) {
  return filePath
    .split("/")
    .at(-2)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function idFromPath(pack, filePath) {
  const parts = filePath.split("/").slice(0, -1);
  const id = pack === "design" ? parts.join("/") : parts.at(-1);
  return id.replace(/[^a-z0-9/_-]/gi, "-").toLowerCase();
}

function fileNameForPattern(id) {
  return id.replace(/^[^:]+:/, "").replace(/\//g, "__");
}

function extractUrls(markdown) {
  return [...new Set(markdown.match(/https?:\/\/[^\s)]+/g) ?? [])];
}

function sectionText(markdown, names) {
  const section = sectionBody(markdown, names);
  if (!section) {
    return "";
  }

  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("- "))
    .join(" ")
    .trim();
}

function sectionBullets(markdown, names) {
  const section = sectionBody(markdown, names);
  if (!section) {
    return [];
  }

  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function sectionBody(markdown, names) {
  const headings = headingRanges(markdown);
  const wanted = names.map((name) => normalizeHeading(name));
  const match = headings.find((heading) => wanted.includes(normalizeHeading(heading.title)));
  if (!match) {
    return "";
  }

  return markdown.slice(match.bodyStart, match.bodyEnd).trim();
}

function headingRanges(markdown) {
  const matches = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const next = matches[index + 1];
    return {
      title: match[1].trim(),
      bodyStart: match.index + match[0].length,
      bodyEnd: next?.index ?? markdown.length
    };
  });
}

function normalizeHeading(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function useOnlyWhenBullets(markdown) {
  const gate = sectionBody(markdown, ["Applicability Gate"]);
  const beforeDoNot = gate.split(/\n\s*Do not use this pattern when:/i)[0] ?? "";
  return beforeDoNot
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function doNotUseBullets(markdown) {
  const gate = sectionBody(markdown, ["Applicability Gate"]);
  const afterDoNot = gate.split(/\n\s*Do not use this pattern when:/i)[1] ?? "";
  return afterDoNot
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function firstParagraph(markdown) {
  return markdown
    .replace(/^#\s+.+$/m, "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith("#") && !block.startsWith("- ")) ?? "";
}

function firstNonEmpty(values) {
  return values.find((value) => value.trim().length > 0).trim();
}

function firstNonEmptyArray(values) {
  return values.find((value) => value.length > 0) ?? [];
}

function renderPatternsModule(manifest, patterns) {
  const cloudPatterns = patterns.filter((pattern) => pattern.id.startsWith("cloud:"));
  const designPatterns = patterns.filter((pattern) => pattern.id.startsWith("design:"));

  return `// This file is generated by scripts/sync-patterns.mjs. Do not edit by hand.
import type { AgentPattern } from "../types.js";

export const bundledPatternManifest = ${JSON.stringify(manifest, null, 2)} as const;

export const cloudPatterns = ${JSON.stringify(cloudPatterns, null, 2)} satisfies AgentPattern[];

export const designPatterns = ${JSON.stringify(designPatterns, null, 2)} satisfies AgentPattern[];

export const bundledPatterns = [...cloudPatterns, ...designPatterns] satisfies AgentPattern[];

export function getBundledPattern(id: string): AgentPattern | undefined {
  return bundledPatterns.find((pattern) => pattern.id === id);
}
`;
}
