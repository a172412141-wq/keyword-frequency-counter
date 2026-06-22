import { describe, expect, it } from "vitest";
import { analyzeWordFrequency } from "./wordFrequency";

describe("analyzeWordFrequency", () => {
  it("默认统计单词根并稳定排序", () => {
    const result = analyzeWordFrequency(`carry on luggage
luggage sets
hard shell luggage
carry on suitcase
spinner wheels luggage`);

    expect(result.totalWords).toBe(14);
    expect(result.totalItems).toBe(14);
    expect(result.uniqueWords).toBe(9);
    expect(result.groups).toHaveLength(1);
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

  it("统计双词根且不跨行拼接", () => {
    const result = analyzeWordFrequency("carry on luggage\ncarry on suitcase", [2]);

    expect(result.totalWords).toBe(6);
    expect(result.totalItems).toBe(4);
    expect(result.groups[0].rows.map(({ word, count }) => [word, count])).toEqual([
      ["carry on", 2],
      ["on luggage", 1],
      ["on suitcase", 1],
    ]);
    expect(result.groups[0].rows[0].percentage).toBe(0.5);
    expect(analyzeWordFrequency("carry\non", [2]).groups).toEqual([]);
  });

  it("统计三词根", () => {
    const result = analyzeWordFrequency("carry on luggage\ncarry on suitcase", [3]);

    expect(result.totalItems).toBe(2);
    expect(result.groups[0].rows.map((row) => row.word)).toEqual([
      "carry on luggage",
      "carry on suitcase",
    ]);
  });

  it("可同时输出单、双、三词根并分别计算占比", () => {
    const result = analyzeWordFrequency("carry on luggage\ncarry on suitcase", [3, 1, 2]);

    expect(result.groups.map((group) => group.size)).toEqual([1, 2, 3]);
    expect(result.groups.map((group) => group.totalItems)).toEqual([6, 4, 2]);
    expect(result.totalItems).toBe(12);
    expect(result.groups[1].rows[0]).toMatchObject({
      word: "carry on",
      count: 2,
      percentage: 0.5,
    });
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
      totalItems: 0,
      uniqueWords: 0,
      rows: [],
      groups: [],
    });
  });
});
