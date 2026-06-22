export const ROOT_CATEGORIES = [
  "core_product",
  "scenario",
  "feature_accessory",
  "size_capacity",
  "material_color",
  "audience",
  "modifier",
  "noise",
] as const;

export type RootCategory = (typeof ROOT_CATEGORIES)[number];

export type RootCandidate = {
  id: string;
  root: string;
  canonicalRoot: string;
  category: RootCategory;
  synonymGroupId: string;
  conflictGroupId: string;
  enabled: boolean;
  sourceCount: number;
  sourceKeywords: string[];
  confidence: number;
};

export type UserRootRule = {
  id: string;
  phrase: string;
  canonicalRoot: string;
  category: RootCategory;
  synonymGroupId: string;
  conflictGroupId: string;
  defaultEnabled: boolean;
  updatedAt: string;
};

export type CombinationMode = "precision" | "expanded" | "full";
export type OutputCase = "lowercase" | "title";

export type CombinationSettings = {
  outputCase: OutputCase;
  mode: CombinationMode;
  minRoots: number;
  maxRoots: number;
  maxFeatures: number;
  includeModifier: boolean;
  includeAudience: boolean;
  filterNoise: boolean;
  maxResults: number;
};

export type GeneratedKeyword = {
  keyword: string;
  rootCount: number;
  categories: RootCategory[];
  source: string;
  averageSourceCount: number;
};

export type CombinationStats = {
  identifiedRoots: number;
  enabledRoots: number;
  generatedBeforeFiltering: number;
  conflictFiltered: number;
  finalResults: number;
  truncated: boolean;
};

export type CombinationGenerationResult = {
  keywords: GeneratedKeyword[];
  stats: CombinationStats;
};

export const DEFAULT_COMBINATION_SETTINGS: CombinationSettings = {
  outputCase: "lowercase",
  mode: "precision",
  minRoots: 2,
  maxRoots: 5,
  maxFeatures: 2,
  includeModifier: true,
  includeAudience: false,
  filterNoise: true,
  maxResults: 500,
};
