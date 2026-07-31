import { describe, expect, it } from "vitest";
import { analyzeReviewSample, type NormalizedReview } from "./amazonReviewAnalyzer";
import { buildReviewDocx, buildReviewPdf } from "./reviewReportDocuments";

describe("review report documents", () => {
  it("creates valid DOCX and PDF containers from the same analysis", async () => {
    const analysis = analyzeReviewSample(
      "B0727Y5L53",
      "full",
      [
        review(1, "Broken after one use", "The product broke and felt poorly made."),
        review(2, "Wrong size", "It was too small and did not fit."),
        review(3, "Hard setup", "The instructions were confusing and hard to install."),
        review(5, "Great value", "Good quality, easy to use and worth the price."),
      ],
    );

    const [docx, pdf] = await Promise.all([
      buildReviewDocx(analysis),
      buildReviewPdf(analysis),
    ]);

    expect(docx.subarray(0, 2).toString("ascii")).toBe("PK");
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(docx.length).toBeGreaterThan(5_000);
    expect(pdf.length).toBeGreaterThan(5_000);
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
    helpfulVotes: 2,
    verifiedPurchase: true,
    vineReview: false,
    hasImages: false,
    hasVideo: false,
    originDescription: "Reviewed in the United States on July 1, 2026",
  };
}
