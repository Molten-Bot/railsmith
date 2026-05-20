export function suggestPatterns(input) {
    if (input.llm) {
        return sortSuggestions(input.llm.suggestPatterns({
            repoFacts: input.repoFacts,
            patterns: input.patterns,
            goal: input.goal
        }));
    }
    const context = [
        input.goal ?? "",
        input.repoFacts.packageName ?? "",
        input.repoFacts.packageDescription ?? "",
        input.repoFacts.frameworks.join(" "),
        Object.keys(input.repoFacts.scripts).join(" "),
        Object.values(input.repoFacts.scripts).join(" ")
    ].join(" ").toLowerCase();
    return sortSuggestions(input.patterns.map((pattern) => scorePattern(pattern, context)).filter((suggestion) => suggestion.score > 0));
}
function scorePattern(pattern, context) {
    const reasons = [];
    let score = 0;
    for (const token of tokensFor(pattern)) {
        if (context.includes(token)) {
            score += token.length > 5 ? 3 : 1;
            reasons.push(`Matched "${token}".`);
        }
    }
    if (pattern.applyWhen.some((item) => containsAnyWord(context, item))) {
        score += 2;
        reasons.push("Goal resembles the pattern applicability gate.");
    }
    return {
        pattern,
        score,
        reasons: unique(reasons)
    };
}
function tokensFor(pattern) {
    return unique([
        pattern.id,
        pattern.title,
        ...pattern.title.split(/\s+/),
        ...pattern.intent.split(/\s+/)
    ].map((token) => token.toLowerCase().replace(/[^a-z0-9:-]/g, "")).filter((token) => token.length > 2));
}
function containsAnyWord(context, text) {
    return text.toLowerCase()
        .split(/[^a-z0-9:-]+/)
        .filter((word) => word.length > 4)
        .some((word) => context.includes(word));
}
function sortSuggestions(suggestions) {
    return [...suggestions].sort((left, right) => right.score - left.score || left.pattern.id.localeCompare(right.pattern.id));
}
function unique(values) {
    return [...new Set(values)];
}
//# sourceMappingURL=suggest.js.map