import { defaultConflictGroup, PHRASE_DICTIONARY, STOP_WORDS } from "./keywordConfig";
import { normalizeKeyword } from "./keywordNormalizer";
import { applySynonymCanonicalization, findSynonymGroup } from "./synonymRules";
import {
  ROOT_CATEGORIES,
  type RootCandidate,
  type RootCategory,
  type UserRootRule,
} from "./keywordTypes";

type CountedPhrase = {
  root: string;
  category: RootCategory;
  sourceCount: number;
  confidence: number;
  userRule?: UserRootRule;
};

function countNgrams(keywords: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const keyword of keywords) {
    const words = keyword.split(" ").filter(Boolean);
    for (let size = 1; size <= Math.min(4, words.length); size += 1) {
      for (let index = 0; index <= words.length - size; index += 1) {
        const phrase = words.slice(index, index + size).join(" ");
        counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
  }

  return counts;
}

function containsPhrase(container: string, phrase: string): boolean {
  return ` ${container} `.includes(` ${phrase} `);
}

function sourceKeywordsFor(root: string, keywords: string[]): string[] {
  return Array.from(new Set(keywords.filter((keyword) => containsPhrase(keyword, root))));
}

function isCompositeCore(root: string): boolean {
  const hasNestedCore = PHRASE_DICTIONARY.core_product.some(
    (phrase) => phrase !== root && containsPhrase(root, normalizeKeyword(phrase)),
  );
  const hasNestedScenario = PHRASE_DICTIONARY.scenario.some((phrase) =>
    containsPhrase(root, normalizeKeyword(phrase)),
  );
  return hasNestedCore && hasNestedScenario;
}

function recognizedPhrases(
  counts: Map<string, number>,
  userRules: UserRootRule[],
): CountedPhrase[] {
  const phrases: CountedPhrase[] = [];
  const userRuleRoots = new Set(userRules.map((rule) => normalizeKeyword(rule.phrase)));

  for (const category of ROOT_CATEGORIES) {
    for (const configuredPhrase of PHRASE_DICTIONARY[category]) {
      const root = normalizeKeyword(configuredPhrase);
      if (userRuleRoots.has(root)) continue;
      const sourceCount = counts.get(root) ?? 0;
      if (!sourceCount || (category === "core_product" && isCompositeCore(root))) continue;

      phrases.push({ root, category, sourceCount, confidence: 0.98 });
    }
  }

  for (const rule of userRules) {
    const root = normalizeKeyword(rule.phrase);
    const sourceCount = counts.get(root) ?? 0;
    if (!root || !sourceCount) continue;
    phrases.push({
      root,
      category: rule.category,
      sourceCount,
      confidence: 1,
      userRule: rule,
    });
  }

  const unique = Array.from(
    new Map(phrases.map((phrase) => [`${phrase.category}:${phrase.root}`, phrase])).values(),
  );

  return unique.filter((candidate) => {
    if (candidate.root.split(" ").length > 1) return true;

    return !unique.some(
      (other) =>
        other.category === candidate.category &&
        other.root !== candidate.root &&
        other.root.split(" ").length > 1 &&
        other.sourceCount >= candidate.sourceCount &&
        containsPhrase(other.root, candidate.root),
    );
  });
}

function inferUnknownCategory(root: string): RootCategory {
  if (/^\d+\s*(?:inch|in|l|piece)$/.test(root)) return "size_capacity";
  if (STOP_WORDS.has(root)) return "noise";
  return "modifier";
}

function addUnknownPhrases(
  counts: Map<string, number>,
  recognized: CountedPhrase[],
): CountedPhrase[] {
  const additions: CountedPhrase[] = [];
  const recognizedRoots = new Set(recognized.map((item) => item.root));
  const coveredUnigramCounts = new Map<string, number>();

  for (const item of recognized) {
    const words = item.root.split(" ");
    if (words.length === 1) continue;
    for (const word of words) {
      coveredUnigramCounts.set(word, (coveredUnigramCounts.get(word) ?? 0) + item.sourceCount);
    }
  }

  for (const [root, sourceCount] of counts) {
    if (recognizedRoots.has(root)) continue;
    const words = root.split(" ");

    if (words.length === 1) {
      if ((coveredUnigramCounts.get(root) ?? 0) >= sourceCount) continue;
      additions.push({
        root,
        category: inferUnknownCategory(root),
        sourceCount,
        confidence: STOP_WORDS.has(root) ? 0.99 : Math.min(0.72, 0.42 + sourceCount * 0.06),
      });
      continue;
    }

    if (sourceCount < 2) continue;
    const containsKnownRoot = recognized.some((item) => containsPhrase(root, item.root));
    if (containsKnownRoot) continue;

    const hasLongerRepeatedVersion = Array.from(counts.entries()).some(
      ([other, otherCount]) =>
        other !== root &&
        other.split(" ").length > words.length &&
        otherCount >= sourceCount &&
        containsPhrase(other, root),
    );
    if (hasLongerRepeatedVersion) continue;

    additions.push({
      root,
      category: "modifier",
      sourceCount,
      confidence: Math.min(0.78, 0.54 + sourceCount * 0.04),
    });
  }

  return additions;
}

export function extractRoots(keywords: string[], userRules: UserRootRule[] = []): RootCandidate[] {
  const normalizedKeywords = keywords.map(normalizeKeyword).filter(Boolean);
  if (normalizedKeywords.length === 0) return [];

  const counts = countNgrams(normalizedKeywords);
  const recognized = recognizedPhrases(counts, userRules);
  const phrases = [...recognized, ...addUnknownPhrases(counts, recognized)];

  const candidates = phrases.map((phrase, index): RootCandidate => {
    const synonymGroup = findSynonymGroup(phrase.root);
    const rule = phrase.userRule;
    return {
      id: `${phrase.root.replace(/\s+/g, "-")}-${index}`,
      root: phrase.root,
      canonicalRoot: rule?.canonicalRoot || synonymGroup?.canonical || phrase.root,
      category: phrase.category,
      synonymGroupId: rule?.synonymGroupId ?? synonymGroup?.id ?? "",
      conflictGroupId: rule?.conflictGroupId ?? defaultConflictGroup(phrase.root),
      enabled: rule?.defaultEnabled ?? phrase.category !== "noise",
      sourceCount: phrase.sourceCount,
      sourceKeywords: sourceKeywordsFor(phrase.root, normalizedKeywords),
      confidence: phrase.confidence,
    };
  });

  const canonicalized = applySynonymCanonicalization(candidates);
  const rulesByRoot = new Map(userRules.map((rule) => [normalizeKeyword(rule.phrase), rule]));
  const canonicalByGroup = new Map(
    userRules
      .filter((rule) => rule.synonymGroupId && rule.canonicalRoot)
      .map((rule) => [rule.synonymGroupId, rule.canonicalRoot]),
  );
  const withUserOverrides = canonicalized.map((candidate) => {
    const rule = rulesByRoot.get(candidate.root);
    return {
      ...candidate,
      canonicalRoot:
        rule?.canonicalRoot ||
        canonicalByGroup.get(candidate.synonymGroupId) ||
        candidate.canonicalRoot,
    };
  });

  const categoryRank = new Map(ROOT_CATEGORIES.map((category, index) => [category, index]));
  return withUserOverrides.sort((a, b) => {
    const categoryDifference =
      (categoryRank.get(a.category) ?? 99) - (categoryRank.get(b.category) ?? 99);
    if (categoryDifference !== 0) return categoryDifference;
    if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
    if (b.root.length !== a.root.length) return b.root.length - a.root.length;
    return a.root.localeCompare(b.root, "en");
  });
}
