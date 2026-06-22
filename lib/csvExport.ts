import type { GeneratedKeyword } from "./keywordTypes";
import { copyTextToClipboard } from "./clipboard";

function escapeCsv(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function generateCombinationsCsv(keywords: GeneratedKeyword[]): string {
  const header = "keyword,rootCount,categories,source";
  const rows = keywords.map((item) =>
    [
      item.keyword,
      item.rootCount.toString(),
      item.categories.join("|"),
      item.source,
    ].map(escapeCsv).join(","),
  );
  return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export async function copyGeneratedKeywords(keywords: GeneratedKeyword[]): Promise<void> {
  await copyTextToClipboard(keywords.map((item) => item.keyword).join("\n"));
}

export function downloadCombinationsCsv(keywords: GeneratedKeyword[]): void {
  const blob = new Blob([generateCombinationsCsv(keywords)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "smart-keyword-combinations.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
