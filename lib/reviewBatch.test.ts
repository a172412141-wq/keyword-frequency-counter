import { describe, expect, it } from "vitest";
import {
  MAX_REVIEW_BATCH_SIZE,
  isValidAsin,
  parseAsinBatch,
} from "./reviewBatch";

describe("parseAsinBatch", () => {
  it("extracts ASINs from pasted columns, CSV and product URLs", () => {
    const parsed = parseAsinBatch(`ASIN
B0727Y5L53
https://www.amazon.com/dp/B0ABCDEF12
"B0727Y5L53",note
`);

    expect(parsed.asins).toEqual(["B0727Y5L53", "B0ABCDEF12"]);
    expect(parsed.duplicateCount).toBe(1);
    expect(parsed.truncatedCount).toBe(0);
  });

  it("limits a batch and reports truncation", () => {
    const values = Array.from(
      { length: MAX_REVIEW_BATCH_SIZE + 3 },
      (_, index) => `B0${String(index).padStart(8, "0")}`,
    );
    const parsed = parseAsinBatch(values.join("\n"));

    expect(parsed.asins).toHaveLength(MAX_REVIEW_BATCH_SIZE);
    expect(parsed.truncatedCount).toBe(3);
  });
});
describe("isValidAsin", () => {
  it("accepts 10-character alphanumeric ASINs", () => {
    expect(isValidAsin("b0727y5l53")).toBe(true);
    expect(isValidAsin("B0727Y5L5")).toBe(false);
    expect(isValidAsin("B0727Y5L5-")).toBe(false);
  });
});
