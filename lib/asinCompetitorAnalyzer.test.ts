import { describe, expect, it } from "vitest";
import {
  analyzeCompetitor,
  deriveAppearanceRelevance,
  parseCompetitorRows,
  type ProductMetrics,
} from "./asinCompetitorAnalyzer";

const myProduct: ProductMetrics = {
  asin: "B0MYASIN",
  price: 100,
  smallCategoryRank: 1000,
  ratingCount: 500,
  starRating: 4.4,
};

describe("asinCompetitorAnalyzer", () => {
  it("把强相关且综合优势明显的竞品归入高竞争力竞对", () => {
    const result = analyzeCompetitor(myProduct, {
      asin: "B0HIGH",
      relevance: "strong",
      price: 80,
      smallCategoryRank: 700,
      ratingCount: 3000,
      starRating: 4.7,
    });

    expect(result.segment).toBe("highCompetitiveness");
    expect(result.score).toBeGreaterThan(0.5);
  });

  it("把强相关但明显弱于我方的竞品归入低竞争力竞对", () => {
    const result = analyzeCompetitor(myProduct, {
      asin: "B0LOW",
      relevance: "strong",
      price: 130,
      smallCategoryRank: 1500,
      ratingCount: 80,
      starRating: 4.1,
    });

    expect(result.segment).toBe("lowCompetitiveness");
    expect(result.score).toBeLessThan(-0.5);
  });

  it("强相关且核心指标接近时归入强相关竞对", () => {
    const result = analyzeCompetitor(myProduct, {
      asin: "B0CORE",
      relevance: "strong",
      price: 108,
      smallCategoryRank: 1100,
      ratingCount: 620,
      starRating: 4.5,
    });

    expect(result.segment).toBe("strongRelated");
    expect(result.score).toBe(0);
  });

  it("弱相关和无相关性优先于竞争力评分", () => {
    const weak = analyzeCompetitor(myProduct, {
      asin: "B0WEAK",
      relevance: "weak",
      price: 50,
      smallCategoryRank: 100,
      ratingCount: 10000,
      starRating: 4.9,
    });
    const none = analyzeCompetitor(myProduct, {
      asin: "B0NONE",
      relevance: "none",
      price: 50,
      smallCategoryRank: 100,
      ratingCount: 10000,
      starRating: 4.9,
    });

    expect(weak.segment).toBe("weakRelated");
    expect(none.segment).toBe("unrelated");
  });

  it("价格 15% 和排名 20% 边界仍视为同区间", () => {
    const result = analyzeCompetitor(myProduct, {
      asin: "B0EDGE",
      relevance: "strong",
      price: 85,
      smallCategoryRank: 800,
      ratingCount: 500,
      starRating: 4.4,
    });

    expect(result.segment).toBe("strongRelated");
    expect(result.score).toBe(0);
  });

  it("双方 Rating 数量均在 30 内时弱化评价沉淀", () => {
    const result = analyzeCompetitor(
      {
        asin: "B0NEW",
        price: 100,
        smallCategoryRank: 1000,
        ratingCount: 20,
        starRating: 4.1,
      },
      {
        asin: "B0NEWCOMP",
        relevance: "strong",
        price: 100,
        smallCategoryRank: 1000,
        ratingCount: 25,
        starRating: 4.9,
      },
    );

    expect(result.segment).toBe("strongRelated");
    expect(result.dimensions.find((dimension) => dimension.key === "review")?.active).toBe(false);
  });

  it("从功能、尺寸、材质、形态四维信号推导外观相关性", () => {
    expect(
      deriveAppearanceRelevance({
        functionMatch: true,
        sizeMatch: true,
        materialMatch: false,
        formMatch: true,
      }),
    ).toBe("strong");
    expect(
      deriveAppearanceRelevance({
        functionMatch: true,
        sizeMatch: false,
        materialMatch: false,
        formMatch: false,
      }),
    ).toBe("weak");
    expect(
      deriveAppearanceRelevance({
        functionMatch: false,
        sizeMatch: false,
        materialMatch: false,
        formMatch: false,
      }),
    ).toBe("none");
  });

  it("解析带表头的竞品粘贴数据", () => {
    const parsed = parseCompetitorRows(`ASIN\t外观相关性\t价格\t小类排名\tRating数量\t评星\t备注
B0TEST\t强\t$29.99\t#1,200\t1.2k\t4.6\t同款形态`);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      asin: "B0TEST",
      relevance: "strong",
      price: 29.99,
      smallCategoryRank: 1200,
      ratingCount: 1200,
      starRating: 4.6,
      appearanceNote: "同款形态",
    });
  });

  it("解析免费插件常见导出字段", () => {
    const parsed = parseCompetitorRows(`ASIN\t标题\t类目\t售价\tBSR排名\t评论数\t评分\t主图
B0PLUGIN01\tTravel Backpack with Laptop Sleeve\tLaptop Backpacks\t$42.99\t2,345\t3.1k\t4.7\thttps://example.com/image.jpg`);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      asin: "B0PLUGIN01",
      title: "Travel Backpack with Laptop Sleeve",
      category: "Laptop Backpacks",
      imageUrl: "https://example.com/image.jpg",
      price: 42.99,
      smallCategoryRank: 2345,
      ratingCount: 3100,
      starRating: 4.7,
    });
  });
});
