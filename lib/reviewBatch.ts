export const MAX_REVIEW_BATCH_SIZE = 20;

export type ReviewMode = "basic" | "full" | "max";

export type ParsedAsinBatch = {
  asins: string[];
  duplicateCount: number;
  truncatedCount: number;
};

export function parseAsinBatch(input: string, limit = MAX_REVIEW_BATCH_SIZE): ParsedAsinBatch {
  const tokens = input
    .toUpperCase()
    .replace(/^\uFEFF/, "")
    .split(/[^A-Z0-9]+/)
    .filter((token) => token.length === 10 && /^[A-Z0-9]{10}$/.test(token));

  const unique: string[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const token of tokens) {
    if (seen.has(token)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(token);
    unique.push(token);
  }

  return {
    asins: unique.slice(0, limit),
    duplicateCount,
    truncatedCount: Math.max(0, unique.length - limit),
  };
}

export function isValidAsin(value: string) {
  return /^[A-Z0-9]{10}$/.test(value.trim().toUpperCase());
}
