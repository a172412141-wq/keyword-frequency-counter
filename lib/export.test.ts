import { describe, expect, it } from "vitest";
import { analyzeWordFrequency } from "./wordFrequency";
import { generateCsv, generateTsv } from "./export";

describe("export helpers", () => {
  it("单一类型保持三列 TSV", () => {
    const summary = analyzeWordFrequency("luggage luggage carry");

    expect(generateTsv(summary)).toBe(
      "词根\t出现次数\t占比\nluggage\t2\t66.67%\ncarry\t1\t33.33%",
    );
  });

  it("多种类型增加类型列", () => {
    const summary = analyzeWordFrequency("carry on luggage\ncarry on suitcase", [1, 2]);
    const tsv = generateTsv(summary);

    expect(tsv).toContain("类型\t词根\t出现次数\t占比");
    expect(tsv).toContain("单词根\tcarry\t2\t33.33%");
    expect(tsv).toContain("双词根\tcarry on\t2\t50.00%");
  });

  it("生成带 UTF-8 BOM 的多类型 CSV", () => {
    const summary = analyzeWordFrequency("carry on luggage\ncarry on suitcase", [1, 2]);
    const csv = generateCsv(summary);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("类型,词根,出现次数,占比\r\n单词根,carry,2,33.33%");
    expect(csv).toContain("双词根,carry on,2,50.00%");
  });
});
