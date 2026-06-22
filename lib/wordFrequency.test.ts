import { describe, expect, it } from "vitest";
import { analyzeWordFrequency } from "./wordFrequency";

describe("analyzeWordFrequency", () => {
  it("统计验收样例并稳定排序", () => {
    const result = analyzeWordFrequency(`carry on luggage
luggage sets
hard shell luggage
carry on suitcase
spinner wheels luggage`);

    expect(result.totalWords).toBe(14);
    expect(result.uniqueWords).toBe(9);
    expect(result.rows.map(({ word, count }) => [word, count])).toEqual([
      ["luggage", 4],
      ["carry", 2],
      ["on", 2],
      ["hard", 1],
      ["sets", 1],
      ["shell", 1],
      ["spinner", 1],
      ["suitcase", 1],
      ["wheels", 1],
    ]);
    expect(result.rows[0].percentage).toBeCloseTo(4 / 14);
  });

  it("合并大小写并清理指定标点", () => {
    const result = analyzeWordFrequency(`Luggage luggage, LUGGAGE. "luggage" luggage!`);
    expect(result.totalWords).toBe(5);
    expect(result.rows).toEqual([{ word: "luggage", count: 5, percentage: 1 }]);
  });

  it("将连续空白视为一个分隔符", () => {
    const result = analyzeWordFrequency("carry    on\t\t luggage");
    expect(result.rows.map((row) => row.word)).toEqual(["carry", "luggage", "on"]);
  });

  it("不做词形还原", () => {
    const result = analyzeWordFrequency("bag bags suitcase suitcases luggage luggages");
    expect(result.totalWords).toBe(6);
    expect(result.uniqueWords).toBe(6);
  });

  it("为空白或纯标点输入返回空结果", () => {
    expect(analyzeWordFrequency(" \n\t.,!?;:\"'()[]{} ")).toEqual({
      totalWords: 0,
      uniqueWords: 0,
      rows: [],
    });
  });
});
