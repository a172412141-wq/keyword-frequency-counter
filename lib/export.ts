import type { WordFrequencyResult } from "./wordFrequency";

const formatPercentage = (percentage: number) => `${(percentage * 100).toFixed(2)}%`;

export function generateTsv(rows: WordFrequencyResult[]): string {
  const header = "词根\t出现次数\t占比";
  const body = rows.map(
    ({ word, count, percentage }) => `${word}\t${count}\t${formatPercentage(percentage)}`,
  );

  return [header, ...body].join("\n");
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function generateCsv(rows: WordFrequencyResult[]): string {
  const header = "词根,出现次数,占比";
  const body = rows.map(({ word, count, percentage }) =>
    [escapeCsvCell(word), count.toString(), formatPercentage(percentage)].join(","),
  );

  return `\uFEFF${[header, ...body].join("\r\n")}`;
}

export async function copyRowsToClipboard(rows: WordFrequencyResult[]): Promise<void> {
  const content = generateTsv(rows);

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("复制失败");
  }
}

export function downloadCsv(rows: WordFrequencyResult[]): void {
  const blob = new Blob([generateCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "word-frequency.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
