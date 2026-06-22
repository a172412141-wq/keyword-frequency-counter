import type { RootCandidate } from "./keywordTypes";

function hasDuplicateNonEmpty(values: string[]): boolean {
  const filtered = values.map((value) => value.trim()).filter(Boolean);
  return new Set(filtered).size !== filtered.length;
}

export function hasConflict(roots: RootCandidate[]): boolean {
  if (roots.filter((root) => root.category === "core_product").length > 1) return true;

  if (hasDuplicateNonEmpty(roots.map((root) => root.synonymGroupId))) return true;
  if (hasDuplicateNonEmpty(roots.map((root) => root.conflictGroupId))) return true;

  const normalizedRoots = roots.map((root) => root.canonicalRoot.trim()).filter(Boolean);
  if (new Set(normalizedRoots).size !== normalizedRoots.length) return true;

  return false;
}
