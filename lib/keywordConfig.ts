import type { RootCategory } from "./keywordTypes";

export const CATEGORY_LABELS: Record<RootCategory, string> = {
  core_product: "核心产品",
  scenario: "使用场景",
  feature_accessory: "功能 / 配件",
  size_capacity: "尺寸 / 容量",
  material_color: "材质 / 颜色",
  audience: "目标人群",
  modifier: "修饰词",
  noise: "噪音词",
};

export const CATEGORY_ORDER: RootCategory[] = [
  "size_capacity",
  "material_color",
  "modifier",
  "scenario",
  "feature_accessory",
  "audience",
  "core_product",
  "noise",
];

// 类目词典按分类维护，后续扩展其他 Amazon 类目时只需追加配置。
export const PHRASE_DICTIONARY: Record<RootCategory, readonly string[]> = {
  core_product: [
    "luggage",
    "suitcase",
    "suitcases",
    "suitcase set",
    "luggage set",
    "travel suitcase",
    "carry on luggage",
    "checked luggage",
  ],
  scenario: [
    "carry on",
    "checked",
    "check in",
    "international travel",
    "business trip",
    "family travel",
    "airplane travel",
    "road trip",
    "cabin size",
  ],
  feature_accessory: [
    "tsa lock",
    "tsa",
    "spinner wheels",
    "wheels",
    "silent wheels",
    "expandable",
    "handle",
    "telescoping handle",
    "hard shell",
    "hard side",
  ],
  size_capacity: [
    "20 inch",
    "24 inch",
    "28 inch",
    "20in",
    "24in",
    "28in",
    "2 piece",
    "3 piece",
    "5 piece",
    "40l",
    "65l",
    "106l",
  ],
  material_color: [
    "abs",
    "pc",
    "polycarbonate",
    "aluminum",
    "leather",
    "black",
    "white",
    "blue",
    "pink",
  ],
  audience: ["men", "women", "kids", "family"],
  modifier: ["lightweight", "durable", "premium", "large", "small", "travel"],
  noise: ["for", "with", "and", "or", "the", "a", "an", "of", "to", "in", "on"],
};

export const STOP_WORDS = new Set(PHRASE_DICTIONARY.noise);

export function defaultConflictGroup(root: string): string {
  if (/^(20|24|28)(?:\s*inch|in)$/.test(root)) return "size_dimension";
  if (/^\d+\s*piece$/.test(root)) return "set_quantity";
  if (["black", "white", "blue", "pink"].includes(root)) return "color";
  if (["abs", "pc", "polycarbonate", "aluminum", "leather"].includes(root)) return "material";
  if (["carry on", "checked", "check in", "cabin size"].includes(root)) return "travel_mode";
  if (["large", "small"].includes(root)) return "relative_size";
  return "";
}
