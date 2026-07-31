import { describe, expect, it } from "vitest";
import {
  analyzeReviewSample,
  buildAmazonReviewPackage,
  type NormalizedReview,
} from "./amazonReviewAnalyzer";

describe("analyzeReviewSample", () => {
  it("separates low, middle and high star themes without using a misleading average", () => {
    const reviews = [
      review(1, "Broken after one use", "The product broke and customer service refused a refund."),
      review(2, "Wrong size", "It was too small and did not fit."),
      review(3, "Hard setup", "The instructions were confusing and hard to install."),
      review(5, "Great value", "Good quality, easy to use and worth the price."),
    ];
    const analysis = analyzeReviewSample("B0727Y5L53", "full", reviews);

    expect(analysis.sample.total).toBe(4);
    expect(analysis.sample.lowStarCount).toBe(2);
    expect(analysis.negativeThemes[0].count).toBeGreaterThan(0);
    expect(analysis.positiveThemes.some((theme) => theme.key === "value")).toBe(true);
    expect(analysis.sample.designNote).toContain("不能代表商品真实评分");
  });
});

describe("buildAmazonReviewPackage", () => {
  it("returns one ZIP package for one ASIN", async () => {
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          Reviews: [
            {
              Author: "A",
              Id: null,
              OverallRating: 5,
              Title: "Great value",
              Text: "Good quality and worth the price.",
              OriginDescription: "Reviewed in the United States on July 2, 2026",
              IsVerifiedPurchase: true,
              HelpfulVotes: 2,
              ImageUrls: [],
              MediaUrls: [],
            },
          ],
          PagingNext: "",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as typeof fetch;

    const archive = await buildAmazonReviewPackage("B0727Y5L53", "basic", mockFetch);

    expect(archive.fileName).toMatch(/^B0727Y5L53_review-analysis_\d{4}-\d{2}-\d{2}\.zip$/);
    expect(archive.analysis.sample.total).toBe(1);
    expect(archive.data.readUInt32LE(0)).toBe(0x04034b50);
    expect(archive.data.includes(Buffer.from("B0727Y5L53_review_analysis.docx"))).toBe(true);
    expect(archive.data.includes(Buffer.from("B0727Y5L53_review_analysis.pdf"))).toBe(true);
  });

  it("treats upstream blocking as an error instead of a valid zero-review package", async () => {
    const mockFetch = (async () =>
      new Response("<html>Forbidden</html>", {
        status: 403,
        headers: { "Content-Type": "text/html" },
      })) as typeof fetch;

    await expect(
      buildAmazonReviewPackage("B0727Y5L53", "basic", mockFetch),
    ).rejects.toThrow("评论接口请求失败");
  });
});

function review(rating: number, title: string, text: string): NormalizedReview {
  return {
    sampleRowId: `sample-${rating}`,
    reviewId: null,
    rating,
    date: "2026-07-01",
    title,
    text,
    helpfulVotes: 0,
    verifiedPurchase: true,
    vineReview: false,
    hasImages: false,
    hasVideo: false,
    originDescription: "Reviewed in the United States on July 1, 2026",
  };
}
