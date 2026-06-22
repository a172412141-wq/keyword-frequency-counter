export type WordFrequencyResult = {
  word: string;
  count: number;
  percentage: number;
};

export type WordFrequencySummary = {
  totalWords: number;
  uniqueWords: number;
  rows: WordFrequencyResult[];
};

export const EMPTY_SUMMARY: WordFrequencySummary = {
  totalWords: 0,
  uniqueWords: 0,
  rows: [],
};

// 仅清理产品定义中的基础英文标点；连字符等字符会被保留。
export const PUNCTUATION_REGEX = /[.,!?;:"'()[\]{}]/g;

export function analyzeWordFrequency(input: string): WordFrequencySummary {
  const normalized = input.toLowerCase().replace(PUNCTUATION_REGEX, " ");
  const words = normalized.split(/\s+/).map((word) => word.trim()).filter(Boolean);
  const totalWords = words.length;

  if (totalWords === 0) {
    return { ...EMPTY_SUMMARY };
  }

  const countMap = new Map<string, number>();

  for (const word of words) {
    countMap.set(word, (countMap.get(word) ?? 0) + 1);
  }

  const rows = Array.from(countMap.entries())
    .map(([word, count]) => ({
      word,
      count,
      percentage: count / totalWords,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.word.localeCompare(b.word, "en");
    });

  return {
    totalWords,
    uniqueWords: rows.length,
    rows,
  };
}
