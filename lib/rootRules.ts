import { normalizeKeyword } from "./keywordNormalizer";
import { ROOT_CATEGORIES, type RootCandidate, type UserRootRule } from "./keywordTypes";

export const ROOT_RULE_STORAGE_KEY = "smart-keyword-combiner:root-rules:v1";

export function createUserRootRule(overrides: Partial<UserRootRule> = {}): UserRootRule {
  return {
    id: overrides.id ?? `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    phrase: normalizeKeyword(overrides.phrase ?? ""),
    canonicalRoot: normalizeKeyword(overrides.canonicalRoot ?? ""),
    category: overrides.category ?? "modifier",
    synonymGroupId: overrides.synonymGroupId?.trim().toLowerCase().replace(/\s+/g, "_") ?? "",
    conflictGroupId: overrides.conflictGroupId?.trim().toLowerCase().replace(/\s+/g, "_") ?? "",
    defaultEnabled: overrides.defaultEnabled ?? true,
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}

export function normalizeUserRootRules(value: unknown): UserRootRule[] {
  if (!Array.isArray(value)) return [];

  const byPhrase = new Map<string, UserRootRule>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<UserRootRule>;
    const phrase = normalizeKeyword(candidate.phrase ?? "");
    if (!phrase || phrase.split(" ").length > 4) continue;
    if (!ROOT_CATEGORIES.includes(candidate.category as UserRootRule["category"])) continue;

    byPhrase.set(
      phrase,
      createUserRootRule({
        ...candidate,
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : undefined,
        phrase,
        canonicalRoot: normalizeKeyword(candidate.canonicalRoot ?? phrase) || phrase,
        defaultEnabled: candidate.defaultEnabled !== false,
        updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : undefined,
      }),
    );
  }

  return Array.from(byPhrase.values()).sort((a, b) => a.phrase.localeCompare(b.phrase, "en"));
}

export function rootCandidateToRule(candidate: RootCandidate, existingId?: string): UserRootRule {
  return createUserRootRule({
    id: existingId,
    phrase: candidate.root,
    canonicalRoot: candidate.canonicalRoot,
    category: candidate.category,
    synonymGroupId: candidate.synonymGroupId,
    conflictGroupId: candidate.conflictGroupId,
    defaultEnabled: candidate.enabled,
  });
}

export function hasRootCandidateChanged(current: RootCandidate, baseline?: RootCandidate): boolean {
  if (!baseline) return true;
  return (
    current.canonicalRoot !== baseline.canonicalRoot ||
    current.category !== baseline.category ||
    current.synonymGroupId !== baseline.synonymGroupId ||
    current.conflictGroupId !== baseline.conflictGroupId ||
    current.enabled !== baseline.enabled
  );
}
