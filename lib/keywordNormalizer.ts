const VARIANT_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\bt\s+s\s+a\b/g, "tsa"],
  [/\bsuit\s+case\b/g, "suitcase"],
  [/\bhardshell\b/g, "hard shell"],
  [/\bhardside\b/g, "hard side"],
];

export function normalizeKeyword(input: string): string {
  let normalized = input
    .toLowerCase()
    .replace(/[‐‑‒–—―-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ");

  for (const [pattern, replacement] of VARIANT_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.replace(/\s+/g, " ").trim();
}

export function splitKeywordInput(input: string): string[] {
  return input
    .split(/[\r\n,;，；]+/)
    .map(normalizeKeyword)
    .filter(Boolean);
}
