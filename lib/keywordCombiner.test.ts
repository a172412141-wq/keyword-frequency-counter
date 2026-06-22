import { describe, expect, it } from "vitest";
import { generateCombinations } from "./combinationGenerator";
import { hasConflict } from "./conflictRules";
import { generateCombinationsCsv } from "./csvExport";
import { normalizeKeyword, splitKeywordInput } from "./keywordNormalizer";
import { extractRoots } from "./rootExtractor";
import { LUGGAGE_SAMPLE } from "./sampleData";
import { DEFAULT_COMBINATION_SETTINGS, type RootCandidate } from "./keywordTypes";

function root(overrides: Partial<RootCandidate> & Pick<RootCandidate, "root" | "category">): RootCandidate {
  return {
    id: overrides.root,
    canonicalRoot: overrides.root,
    synonymGroupId: "",
    conflictGroupId: "",
    enabled: true,
    sourceCount: 1,
    sourceKeywords: [overrides.root],
    confidence: 1,
    ...overrides,
  };
}

describe("keyword normalization", () => {
  it("统一大小写、标点、连字符和常见变体", () => {
    expect(normalizeKeyword("  Carry-On, HARDSHELL suit case with T S A!  ")).toBe(
      "carry on hard shell suitcase with tsa",
    );
  });

  it("支持换行、逗号和分号分隔", () => {
    expect(splitKeywordInput("luggage, suitcase; carry-on bag\nchecked luggage")).toEqual([
      "luggage",
      "suitcase",
      "carry on bag",
      "checked luggage",
    ]);
  });
});

describe("root extraction and canonical mapping", () => {
  const roots = extractRoots(splitKeywordInput(LUGGAGE_SAMPLE));

  it("保留高价值短语并抑制被完整覆盖的低质量拆词", () => {
    expect(roots.some((item) => item.root === "tsa lock")).toBe(true);
    expect(roots.some((item) => item.root === "spinner wheels")).toBe(true);
    expect(roots.some((item) => item.root === "lock")).toBe(false);
  });

  it("把核心产品同义词映射到输入中更高频的 canonical root", () => {
    const coreRoots = roots.filter((item) => item.synonymGroupId === "core_luggage");
    expect(coreRoots.length).toBeGreaterThan(1);
    expect(new Set(coreRoots.map((item) => item.canonicalRoot))).toEqual(new Set(["suitcase"]));
  });

  it("自动设置分类和默认冲突组", () => {
    expect(roots.find((item) => item.root === "carry on")).toMatchObject({
      category: "scenario",
      conflictGroupId: "travel_mode",
    });
    expect(roots.find((item) => item.root === "20 inch")).toMatchObject({
      category: "size_capacity",
      conflictGroupId: "size_dimension",
    });
  });
});

describe("conflict rules", () => {
  it("识别同义词组、冲突组和多个核心产品", () => {
    const luggage = root({ root: "luggage", category: "core_product", synonymGroupId: "core" });
    const suitcase = root({ root: "suitcase", category: "core_product", synonymGroupId: "core" });
    const twenty = root({ root: "20 inch", category: "size_capacity", conflictGroupId: "size" });
    const twentyFour = root({ root: "24 inch", category: "size_capacity", conflictGroupId: "size" });

    expect(hasConflict([luggage, suitcase])).toBe(true);
    expect(hasConflict([luggage, twenty, twentyFour])).toBe(true);
    expect(hasConflict([luggage, twenty])).toBe(false);
  });
});

describe("combination generation", () => {
  it("每条结果恰好一个核心产品，并过滤尺寸和场景冲突", () => {
    const roots = extractRoots(splitKeywordInput(LUGGAGE_SAMPLE));
    const result = generateCombinations(roots, {
      ...DEFAULT_COMBINATION_SETTINGS,
      mode: "full",
      maxResults: 1_000,
    });

    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.keywords.some((item) => item.keyword === "carry on suitcase")).toBe(true);
    expect(result.keywords.every((item) => !item.keyword.includes("luggage suitcase"))).toBe(true);
    expect(result.keywords.every((item) => !item.keyword.includes("20 inch 24 inch"))).toBe(true);
    expect(result.keywords.every((item) => !item.keyword.includes("carry on checked"))).toBe(true);
    expect(result.keywords.every((item) => item.categories.includes("core_product"))).toBe(true);
  });

  it("没有核心产品词根时返回空结果", () => {
    const result = generateCombinations(
      [root({ root: "black", category: "material_color" })],
      DEFAULT_COMBINATION_SETTINGS,
    );
    expect(result.keywords).toEqual([]);
  });

  it("导出包含验收要求的 CSV 字段并带 UTF-8 BOM", () => {
    const result = generateCombinations(extractRoots(["carry on luggage"]), {
      ...DEFAULT_COMBINATION_SETTINGS,
      maxResults: 10,
    });
    const csv = generateCombinationsCsv(result.keywords);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("keyword,rootCount,categories,source");
    expect(csv).toContain("carry on luggage,2,scenario|core_product");
  });
});
