"use client";

import { useMemo, useState } from "react";
import { generateCombinations } from "@/lib/combinationGenerator";
import { copyGeneratedKeywords, downloadCombinationsCsv } from "@/lib/csvExport";
import { splitKeywordInput } from "@/lib/keywordNormalizer";
import { extractRoots } from "@/lib/rootExtractor";
import { LUGGAGE_SAMPLE } from "@/lib/sampleData";
import {
  DEFAULT_COMBINATION_SETTINGS,
  type CombinationSettings,
  type RootCandidate,
} from "@/lib/keywordTypes";
import { CombinationResults } from "./CombinationResults";
import { CombinationSettingsPanel } from "./CombinationSettingsPanel";
import { RootCandidateTable } from "./RootCandidateTable";

type Notice = { message: string; tone: "success" | "error" };

export function KeywordCombiner() {
  const [input, setInput] = useState("");
  const [roots, setRoots] = useState<RootCandidate[]>([]);
  const [settings, setSettings] = useState<CombinationSettings>(DEFAULT_COMBINATION_SETTINGS);
  const [notice, setNotice] = useState<Notice | null>(null);
  const result = useMemo(() => generateCombinations(roots, settings), [roots, settings]);
  const hasCoreProduct = roots.some((root) => root.enabled && root.category === "core_product");

  function showNotice(message: string, tone: Notice["tone"] = "success") {
    setNotice({ message, tone });
    window.setTimeout(() => {
      setNotice((current) => (current?.message === message ? null : current));
    }, 2400);
  }

  function analyze(value: string) {
    const nextRoots = extractRoots(splitKeywordInput(value));
    setRoots(nextRoots);
    return nextRoots;
  }

  function handleInput(value: string) {
    setInput(value);
    analyze(value);
    setNotice(null);
  }

  function loadSample() {
    setInput(LUGGAGE_SAMPLE);
    const nextRoots = analyze(LUGGAGE_SAMPLE);
    showNotice(`已加载示例并识别 ${nextRoots.length} 个词根`);
  }

  function updateRoot(id: string, patch: Partial<RootCandidate>) {
    setRoots((current) => current.map((root) => (root.id === id ? { ...root, ...patch } : root)));
  }

  async function handleCopy() {
    if (result.keywords.length === 0) return showNotice("暂无可复制结果", "error");
    try {
      await copyGeneratedKeywords(result.keywords);
      showNotice(`已复制 ${result.keywords.length} 条组合关键词`);
    } catch {
      showNotice("复制失败，请检查浏览器权限", "error");
    }
  }

  return (
    <>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">原始关键词</h2>
              <p className="mt-1 text-sm text-slate-500">每行一个，也支持逗号和分号分隔</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadSample}
                className="min-h-9 rounded-lg bg-teal-50 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-100"
              >
                加载 Luggage 示例
              </button>
              <button
                type="button"
                disabled={!input}
                onClick={() => {
                  setInput("");
                  setRoots([]);
                  setNotice(null);
                }}
                className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                清空
              </button>
            </div>
          </div>
          <label className="sr-only" htmlFor="combiner-input">输入待组合的关键词</label>
          <textarea
            id="combiner-input"
            value={input}
            onChange={(event) => handleInput(event.target.value)}
            spellCheck={false}
            placeholder={LUGGAGE_SAMPLE}
            className="min-h-[310px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 font-mono text-[14px] leading-7 text-slate-800 placeholder:text-slate-300 focus:border-teal-500 focus:bg-white focus:outline-none"
          />
          <p className="mt-3 text-xs leading-5 text-slate-400">输入时自动清洗、识别词根；数据只在浏览器本地处理。</p>
        </section>

        <CombinationSettingsPanel
          settings={settings}
          onChange={(patch) => setSettings((current) => ({ ...current, ...patch }))}
        />
      </div>

      <div className="mt-5">
        <RootCandidateTable roots={roots} onUpdate={updateRoot} />
      </div>

      <div className="mt-5">
        <CombinationResults
          result={result}
          hasRoots={roots.length > 0}
          hasCoreProduct={hasCoreProduct}
          onCopy={handleCopy}
          onExport={() => {
            if (result.keywords.length === 0) return showNotice("暂无可导出结果", "error");
            downloadCombinationsCsv(result.keywords);
            showNotice("组合关键词 CSV 已导出");
          }}
        />
      </div>

      <footer className="mt-6 flex flex-col gap-1 text-xs leading-5 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>词根识别基于可扩展规则词典、频次和短语覆盖优先。</p>
        <p>每条结果恰好包含 1 个核心产品词根</p>
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
