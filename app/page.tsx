"use client";

import { useMemo, useState } from "react";
import { ActionButtons } from "@/components/ActionButtons";
import { FrequencyTable } from "@/components/FrequencyTable";
import { NgramSelector } from "@/components/NgramSelector";
import { SummaryCards } from "@/components/SummaryCards";
import { TextInput } from "@/components/TextInput";
import { copyRowsToClipboard, downloadCsv } from "@/lib/export";
import {
  analyzeWordFrequency,
  EMPTY_SUMMARY,
  type NgramSize,
  type WordFrequencySummary,
} from "@/lib/wordFrequency";

type Notice = {
  message: string;
  tone: "success" | "error";
};

export default function Home() {
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

    if (result.rows.length > 0) {
      showNotice(`统计完成：共识别 ${result.uniqueWords} 个统计项`);
    }
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

  function handleClear() {
    setInput("");
    setSummary(EMPTY_SUMMARY);
    setHasAnalyzed(false);
    setNotice(null);
  }

  async function handleCopy() {
    if (!hasResults) {
      showNotice("暂无可复制结果", "error");
      return;
    }

    try {
      await copyRowsToClipboard(summary);
      showNotice("结果已复制，可直接粘贴到 Excel");
    } catch {
      showNotice("复制失败，请检查浏览器权限", "error");
    }
  }

  function handleExport() {
    if (!hasResults) {
      showNotice("暂无可导出结果", "error");
      return;
    }

    downloadCsv(summary);
    showNotice("CSV 文件已导出");
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 max-w-3xl sm:mb-10">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-700">
            <span className="h-px w-8 bg-teal-500" />
            KEYWORD ANALYSIS
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            关键词词频统计
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            输入多行关键词组，自由选择单词根、双词根或三词根，统计出现次数和占比。
          </p>
        </header>

        <div className="mb-5">
          <NgramSelector selectedSizes={selectedSizes} onToggle={handleSizeToggle} />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <TextInput value={input} onChange={handleInputChange} onAnalyze={handleAnalyze} />
          <aside className="order-2 space-y-5 lg:order-none">
            <SummaryCards
              lineCount={lineCount}
              totalWords={liveSummary.totalWords}
              uniqueWords={liveSummary.uniqueWords}
            />
            <ActionButtons
              hasResults={hasResults}
              hasInput={inputHasContent}
              onAnalyze={handleAnalyze}
              onClear={handleClear}
              onCopy={handleCopy}
              onExport={handleExport}
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
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
          notice ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        } ${notice?.tone === "error" ? "bg-rose-600" : "bg-slate-900"}`}
      >
        {notice?.message ?? ""}
      </div>
    </main>
  );
}
