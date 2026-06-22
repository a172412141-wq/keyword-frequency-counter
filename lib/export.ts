import type { WordFrequencyGroup, WordFrequencySummary } from "./wordFrequency";

const formatPercentage = (percentage: number) => `${(percentage * 100).toFixed(2)}%`;

function includeTypeColumn(summary: WordFrequencySummary): boolean {
  return summary.groups.length > 1;
}

function groupToTsvRows(group: WordFrequencyGroup, withType: boolean): string[] {
  return group.rows.map(({ word, count, percentage }) => {
    const cells = withType ? [group.label, word, count, formatPercentage(percentage)] :
      [word, count, formatPercentage(percentage)];
    return cells.join("\t");
  });
}

export function generateTsv(summary: WordFrequencySummary): string {
  const withType = includeTypeColumn(summary);
  const header = withType ? "类型\t词根\t出现次数\t占比" : "词根\t出现次数\t占比";
  const body = summary.groups.flatMap((group) => groupToTsvRows(group, withType));

  return [header, ...body].join("\n");
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function groupToCsvRows(group: WordFrequencyGroup, withType: boolean): string[] {
  return group.rows.map(({ word, count, percentage }) => {
    const cells = withType ? [group.label, word, count.toString(), formatPercentage(percentage)] :
      [word, count.toString(), formatPercentage(percentage)];
    return cells.map(escapeCsvCell).join(",");
  });
}

export function generateCsv(summary: WordFrequencySummary): string {
  const withType = includeTypeColumn(summary);
  const header = withType ? "类型,词根,出现次数,占比" : "词根,出现次数,占比";
  const body = summary.groups.flatMap((group) => groupToCsvRows(group, withType));

  return `\uFEFF${[header, ...body].join("\r\n")}`;
}

export async function copyRowsToClipboard(summary: WordFrequencySummary): Promise<void> {
  const content = generateTsv(summary);

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

export function downloadCsv(summary: WordFrequencySummary): void {
  const blob = new Blob([generateCsv(summary)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "word-frequency.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
