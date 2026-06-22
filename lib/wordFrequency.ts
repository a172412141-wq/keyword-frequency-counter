export type NgramSize = 1 | 2 | 3;

export type WordFrequencyResult = {
  word: string;
  count: number;
  percentage: number;
};

export type WordFrequencyGroup = {
  size: NgramSize;
  label: string;
  totalItems: number;
  uniqueItems: number;
  rows: WordFrequencyResult[];
};

export type WordFrequencySummary = {
  totalWords: number;
  totalItems: number;
  uniqueWords: number;
  rows: WordFrequencyResult[];
  groups: WordFrequencyGroup[];
};

export const NGRAM_OPTIONS: ReadonlyArray<{
  size: NgramSize;
  label: string;
  example: string;
}> = [
  { size: 1, label: "单词根", example: "luggage" },
  { size: 2, label: "双词根", example: "carry on" },
  { size: 3, label: "三词根", example: "carry on luggage" },
];

export const EMPTY_SUMMARY: WordFrequencySummary = {
  totalWords: 0,
  totalItems: 0,
  uniqueWords: 0,
  rows: [],
  groups: [],
};

// 仅清理产品定义中的基础英文标点；连字符等字符会被保留。
export const PUNCTUATION_REGEX = /[.,!?;:"'()[\]{}]/g;

function tokenizeLines(input: string): string[][] {
  return input
    .toLowerCase()
    .replace(PUNCTUATION_REGEX, " ")
    .split(/\r?\n/)
    .map((line) => line.split(/\s+/).map((word) => word.trim()).filter(Boolean))
    .filter((words) => words.length > 0);
}

function createNgrams(lines: string[][], size: NgramSize): string[] {
  const ngrams: string[] = [];

  for (const words of lines) {
    for (let index = 0; index <= words.length - size; index += 1) {
      ngrams.push(words.slice(index, index + size).join(" "));
    }
  }

  return ngrams;
}

function analyzeGroup(lines: string[][], size: NgramSize): WordFrequencyGroup | null {
  const items = createNgrams(lines, size);
  const totalItems = items.length;

  if (totalItems === 0) {
    return null;
  }

  const countMap = new Map<string, number>();

  for (const item of items) {
    countMap.set(item, (countMap.get(item) ?? 0) + 1);
  }

  const rows = Array.from(countMap.entries())
    .map(([word, count]) => ({
      word,
      count,
      percentage: count / totalItems,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.word.localeCompare(b.word, "en");
    });

  return {
    size,
    label: NGRAM_OPTIONS.find((option) => option.size === size)?.label ?? `${size} 词根`,
    totalItems,
    uniqueItems: rows.length,
    rows,
  };
}

export function analyzeWordFrequency(
  input: string,
  sizes: readonly NgramSize[] = [1],
): WordFrequencySummary {
  const lines = tokenizeLines(input);
  const totalWords = lines.reduce((total, words) => total + words.length, 0);

  if (totalWords === 0 || sizes.length === 0) {
    return { ...EMPTY_SUMMARY };
  }

  const uniqueSizes = Array.from(new Set(sizes)).sort((a, b) => a - b);
  const groups = uniqueSizes
    .map((size) => analyzeGroup(lines, size))
    .filter((group): group is WordFrequencyGroup => group !== null);
  const rows = groups.flatMap((group) => group.rows);

  return {
    totalWords,
    totalItems: groups.reduce((total, group) => total + group.totalItems, 0),
    uniqueWords: groups.reduce((total, group) => total + group.uniqueItems, 0),
    rows,
    groups,
  };
}
