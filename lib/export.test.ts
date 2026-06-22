import { describe, expect, it } from "vitest";
import { generateCsv, generateTsv } from "./export";

const rows = [
  { word: "luggage", count: 4, percentage: 4 / 14 },
  { word: "carry", count: 2, percentage: 2 / 14 },
];

describe("export helpers", () => {
  it("生成适合粘贴到表格的 TSV", () => {
    expect(generateTsv(rows)).toBe(
      "词根\t出现次数\t占比\nluggage\t4\t28.57%\ncarry\t2\t14.29%",
    );
  });

  it("生成带 UTF-8 BOM 的 CSV", () => {
    const csv = generateCsv(rows);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("词根,出现次数,占比\r\nluggage,4,28.57%");
  });
});
