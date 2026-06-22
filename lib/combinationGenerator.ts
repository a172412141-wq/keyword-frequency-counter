import { CATEGORY_ORDER } from "./keywordConfig";
import { hasConflict } from "./conflictRules";
import type {
  CombinationGenerationResult,
  CombinationMode,
  CombinationSettings,
  GeneratedKeyword,
  RootCandidate,
  RootCategory,
} from "./keywordTypes";

const CATEGORY_RANK = new Map(CATEGORY_ORDER.map((category, index) => [category, index]));

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function representativeOptions(roots: RootCandidate[], settings: CombinationSettings): RootCandidate[] {
  const filtered = roots.filter((root) => {
    if (!root.enabled) return false;
    if (settings.filterNoise && root.category === "noise") return false;
    if (!settings.includeModifier && root.category === "modifier") return false;
    if (!settings.includeAudience && root.category === "audience") return false;
    return true;
  });

  const grouped = new Map<string, RootCandidate[]>();
  for (const root of filtered) {
    const key = root.synonymGroupId
      ? `${root.category}:synonym:${root.synonymGroupId}`
      : `${root.category}:root:${root.id}`;
    const members = grouped.get(key) ?? [];
    members.push(root);
    grouped.set(key, members);
  }

  return Array.from(grouped.values()).map((members) =>
    [...members].sort((a, b) => {
      if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
      return a.root.localeCompare(b.root, "en");
    })[0],
  );
}

function categoryCounts(roots: RootCandidate[]): Map<RootCategory, number> {
  const counts = new Map<RootCategory, number>();
  for (const root of roots) counts.set(root.category, (counts.get(root.category) ?? 0) + 1);
  return counts;
}

function passesModeRules(
  roots: RootCandidate[],
  mode: CombinationMode,
  settings: CombinationSettings,
): boolean {
  const counts = categoryCounts(roots);
  const features = counts.get("feature_accessory") ?? 0;
  if (features > settings.maxFeatures) return false;

  if (mode === "precision") {
    if (features > 1) return false;
    if ((counts.get("scenario") ?? 0) > 1) return false;
    if ((counts.get("size_capacity") ?? 0) > 1) return false;
    if ((counts.get("material_color") ?? 0) > 1) return false;
    if ((counts.get("modifier") ?? 0) > 1) return false;
  }

  if (mode === "expanded") {
    if ((counts.get("scenario") ?? 0) > 1) return false;
    if ((counts.get("modifier") ?? 0) > 2) return false;
  }

  return true;
}

function toGeneratedKeyword(
  roots: RootCandidate[],
  settings: CombinationSettings,
): GeneratedKeyword {
  const ordered = [...roots].sort((a, b) => {
    const rankDifference =
      (CATEGORY_RANK.get(a.category) ?? 99) - (CATEGORY_RANK.get(b.category) ?? 99);
    if (rankDifference !== 0) return rankDifference;
    return b.sourceCount - a.sourceCount;
  });
  const lowercaseKeyword = ordered.map((root) => root.canonicalRoot).join(" ");
  const categories = Array.from(new Set(ordered.map((root) => root.category)));

  return {
    keyword: settings.outputCase === "title" ? titleCase(lowercaseKeyword) : lowercaseKeyword,
    rootCount: roots.length,
    categories,
    source: ordered.map((root) => root.root).join(" + "),
    averageSourceCount:
      roots.reduce((total, root) => total + root.sourceCount, 0) / Math.max(1, roots.length),
  };
}

function keywordSort(a: GeneratedKeyword, b: GeneratedKeyword): number {
  if (a.rootCount !== b.rootCount) return a.rootCount - b.rootCount;

  const aScenario = a.categories.includes("scenario") ? 1 : 0;
  const bScenario = b.categories.includes("scenario") ? 1 : 0;
  if (aScenario !== bScenario) return bScenario - aScenario;

  const aFeature = a.categories.includes("feature_accessory") ? 1 : 0;
  const bFeature = b.categories.includes("feature_accessory") ? 1 : 0;
  if (aFeature !== bFeature) return bFeature - aFeature;

  if (a.averageSourceCount !== b.averageSourceCount) {
    return b.averageSourceCount - a.averageSourceCount;
  }

  return a.keyword.localeCompare(b.keyword, "en");
}

function combinationsOfSize<T>(
  items: T[],
  size: number,
  visit: (combination: T[]) => boolean,
): boolean {
  const chosen: T[] = [];

  function walk(start: number): boolean {
    if (chosen.length === size) return visit([...chosen]);
    const remainingNeeded = size - chosen.length;
    for (let index = start; index <= items.length - remainingNeeded; index += 1) {
      chosen.push(items[index]);
      if (!walk(index + 1)) return false;
      chosen.pop();
    }
    return true;
  }

  return walk(0);
}

export function generateCombinations(
  roots: RootCandidate[],
  settings: CombinationSettings,
): CombinationGenerationResult {
  const options = representativeOptions(roots, settings);
  const coreRoots = options.filter((root) => root.category === "core_product");
  const otherRoots = options
    .filter((root) => root.category !== "core_product")
    .sort((a, b) => b.sourceCount - a.sourceCount);
  const minRoots = Math.max(1, Math.min(settings.minRoots, settings.maxRoots));
  const maxRoots = Math.max(minRoots, Math.min(8, settings.maxRoots));
  const maxEvaluations = settings.mode === "precision" ? 30_000 : settings.mode === "expanded" ? 80_000 : 180_000;
  const poolLimit = Math.max(settings.maxResults * 8, 2_000);
  let generatedBeforeFiltering = 0;
  let conflictFiltered = 0;
  let truncated = false;
  const generated = new Map<string, GeneratedKeyword>();

  outer: for (let totalSize = minRoots; totalSize <= maxRoots; totalSize += 1) {
    const additionalSize = totalSize - 1;
    if (additionalSize > otherRoots.length) continue;

    for (const coreRoot of coreRoots) {
      const completed = combinationsOfSize(otherRoots, additionalSize, (additionalRoots) => {
        generatedBeforeFiltering += 1;
        if (generatedBeforeFiltering > maxEvaluations) {
          truncated = true;
          return false;
        }

        const candidate = [coreRoot, ...additionalRoots];
        if (hasConflict(candidate) || !passesModeRules(candidate, settings.mode, settings)) {
          conflictFiltered += 1;
          return true;
        }

        const result = toGeneratedKeyword(candidate, settings);
        if (!generated.has(result.keyword)) generated.set(result.keyword, result);
        if (generated.size >= poolLimit) {
          truncated = true;
          return false;
        }
        return true;
      });

      if (!completed || truncated) break outer;
    }
  }

  const keywords = Array.from(generated.values())
    .sort(keywordSort)
    .slice(0, Math.max(1, settings.maxResults));

  return {
    keywords,
    stats: {
      identifiedRoots: roots.length,
      enabledRoots: roots.filter((root) => root.enabled).length,
      generatedBeforeFiltering: Math.min(generatedBeforeFiltering, maxEvaluations),
      conflictFiltered,
      finalResults: keywords.length,
      truncated,
    },
  };
}
