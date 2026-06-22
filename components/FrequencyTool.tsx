"use client";

import { useMemo, useState } from "react";
import { copyRowsToClipboard, downloadCsv } from "@/lib/export";
import {
  analyzeWordFrequency,
  EMPTY_SUMMARY,
  type NgramSize,
  type WordFrequencySummary,
} from "@/lib/wordFrequency";
import { ActionButtons } from "./ActionButtons";
import { FrequencyTable } from "./FrequencyTable";
import { NgramSelector } from "./NgramSelector";
import { SummaryCards } from "./SummaryCards";
import { TextInput } from "./TextInput";

type Notice = { message: string; tone: "success" | "error" };

export function FrequencyTool() {
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState<WordFrequencySummary>(EMPTY_SUMMARY);
  const [selectedSizes, setSelectedSizes] = useState<NgramSize[]>([1]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const lineCount = useMemo(
    () => input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length,
    [input],
  );
  const liveSummary = useMemo(
    () => analyzeWordFrequency(input, selectedSizes),
    [input, selectedSizes],
  );
  const inputHasContent = input.trim().length > 0;
  const hasResults = summary.rows.length > 0;

  function showNotice(message: string, tone: Notice["tone"] = "success") {
    setNotice({ message, tone });
    window.setTimeout(() => {
      setNotice((current) => (current?.message === message ? null : current));
    }, 2400);
  }

  function handleAnalyze() {
    const result = analyzeWordFrequency(input, selectedSizes);
    setSummary(result);
    setHasAnalyzed(true);
    if (result.rows.length > 0) showNotice(`统计完成：共识别 ${result.uniqueWords} 个统计项`);
  }

  function handleInputChange(value: string) {
    setInput(value);
    if (hasAnalyzed) {
      setSummary(EMPTY_SUMMARY);
      setHasAnalyzed(false);
    }
    setNotice(null);
  }

  function handleSizeToggle(size: NgramSize) {
    if (selectedSizes.includes(size) && selectedSizes.length === 1) {
      showNotice("请至少保留一种输出方式", "error");
      return;
    }
    setSelectedSizes((current) =>
      current.includes(size)
        ? current.filter((item) => item !== size)
        : [...current, size].sort((a, b) => a - b),
    );
    setSummary(EMPTY_SUMMARY);
    setHasAnalyzed(false);
    setNotice(null);
  }

  async function handleCopy() {
    if (!hasResults) return showNotice("暂无可复制结果", "error");
    try {
      await copyRowsToClipboard(summary);
      showNotice("结果已复制，可直接粘贴到 Excel");
    } catch {
      showNotice("复制失败，请检查浏览器权限", "error");
    }
  }

  return (
    <>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <TextInput value={input} onChange={handleInputChange} onAnalyze={handleAnalyze} />
        <aside className="order-2 space-y-5 lg:order-none">
          <SummaryCards
            lineCount={lineCount}
            totalWords={liveSummary.totalWords}
            uniqueWords={liveSummary.uniqueWords}
          />
          <NgramSelector selectedSizes={selectedSizes} onToggle={handleSizeToggle} />
          <ActionButtons
            hasResults={hasResults}
            hasInput={inputHasContent}
            onAnalyze={handleAnalyze}
            onClear={() => {
              setInput("");
              setSummary(EMPTY_SUMMARY);
              setHasAnalyzed(false);
              setNotice(null);
            }}
            onCopy={handleCopy}
            onExport={() => {
              if (!hasResults) return showNotice("暂无可导出结果", "error");
              downloadCsv(summary);
              showNotice("CSV 文件已导出");
            }}
          />
        </aside>
      </div>

      <div className="mt-5">
        <FrequencyTable
          summary={summary}
          hasAnalyzed={hasAnalyzed}
          inputHasContent={inputHasContent}
        />
      </div>

      <footer className="mt-6 flex flex-col gap-1 text-xs leading-5 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>所有统计均在浏览器本地完成，不上传输入内容。</p>
        <p>精确字符串统计 · 不做词形还原或同义词合并</p>
      </footer>

      <div
        aria-live="polite"
        aria-atomic="true"
        className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
          notice ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        } ${notice?.tone === "error" ? "bg-rose-600" : "bg-slate-900"}`}
      >
        {notice?.message ?? ""}
      </div>
    </>
  );
}
