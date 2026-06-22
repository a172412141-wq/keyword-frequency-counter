import { normalizeKeyword } from "./keywordNormalizer";
import type { RootCandidate } from "./keywordTypes";

type SynonymGroup = {
  id: string;
  canonical: string;
  variants: readonly string[];
};

export const SYNONYM_GROUPS: readonly SynonymGroup[] = [
  {
    id: "core_luggage",
    canonical: "suitcase",
    variants: [
      "luggage",
      "suitcase",
      "suitcases",
      "suit case",
      "suitcase set",
      "luggage set",
      "travel suitcase",
      "carry on luggage",
      "checked luggage",
    ],
  },
  {
    id: "hard_shell",
    canonical: "hard shell",
    variants: ["hard shell", "hardshell", "hard side", "hardside"],
  },
  {
    id: "tsa_lock",
    canonical: "tsa lock",
    variants: ["tsa", "tsa lock", "t s a lock"],
  },
  {
    id: "spinner_wheels",
    canonical: "spinner wheels",
    variants: ["spinner wheels", "silent wheels", "wheels"],
  },
  {
    id: "carry_on",
    canonical: "carry on",
    variants: ["carry on", "carry-on", "cabin size"],
  },
  {
    id: "checked",
    canonical: "checked",
    variants: ["checked", "check in", "check-in"],
  },
];

const VARIANT_LOOKUP = new Map<string, SynonymGroup>();

for (const group of SYNONYM_GROUPS) {
  for (const variant of group.variants) {
    VARIANT_LOOKUP.set(normalizeKeyword(variant), group);
  }
}

export function findSynonymGroup(root: string): SynonymGroup | undefined {
  return VARIANT_LOOKUP.get(normalizeKeyword(root));
}

const CORE_TIE_BREAK = new Map([
  ["suitcase", 0],
  ["luggage", 1],
]);

function selectCoreCanonical(candidates: RootCandidate[]): string {
  return [...candidates]
    .sort((a, b) => {
      if (b.sourceCount !== a.sourceCount) return b.sourceCount - a.sourceCount;
      const aRank = CORE_TIE_BREAK.get(a.root) ?? 2;
      const bRank = CORE_TIE_BREAK.get(b.root) ?? 2;
      if (aRank !== bRank) return aRank - bRank;
      return a.root.localeCompare(b.root, "en");
    })[0]?.root ?? "suitcase";
}

export function applySynonymCanonicalization(candidates: RootCandidate[]): RootCandidate[] {
  const byGroup = new Map<string, RootCandidate[]>();

  for (const candidate of candidates) {
    if (!candidate.synonymGroupId) continue;
    const current = byGroup.get(candidate.synonymGroupId) ?? [];
    current.push(candidate);
    byGroup.set(candidate.synonymGroupId, current);
  }

  const canonicalByGroup = new Map<string, string>();
  for (const [groupId, members] of byGroup) {
    const configured = SYNONYM_GROUPS.find((group) => group.id === groupId);
    canonicalByGroup.set(
      groupId,
      groupId === "core_luggage"
        ? selectCoreCanonical(members)
        : configured?.canonical ?? members[0].root,
    );
  }

  return candidates.map((candidate) => ({
    ...candidate,
    canonicalRoot: candidate.synonymGroupId
      ? canonicalByGroup.get(candidate.synonymGroupId) ?? candidate.root
      : candidate.root,
  }));
}
