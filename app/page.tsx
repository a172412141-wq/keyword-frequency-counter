"use client";

import { useState } from "react";
import { FrequencyTool } from "@/components/FrequencyTool";
import { KeywordCombiner } from "@/components/KeywordCombiner";

type ActiveTool = "frequency" | "combiner";

const TOOL_COPY = {
  frequency: {
    eyebrow: "KEYWORD ANALYSIS",
    title: "关键词词频统计",
    description: "输入多行关键词组，自由选择单词根、双词根或三词根，统计出现次数和占比。",
  },
  combiner: {
    eyebrow: "SMART KEYWORD COMBINER",
    title: "组合关键词工具",
    description: "自动识别词根、归一同义词并过滤冲突，生成自然、可控的亚马逊关键词组合。",
  },
} as const;

export default function Home() {
  const [activeTool, setActiveTool] = useState<ActiveTool>("frequency");
  const copy = TOOL_COPY[activeTool];

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav
          aria-label="关键词工具切换"
          className="mb-8 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        >
          <ToolButton
            active={activeTool === "frequency"}
            onClick={() => setActiveTool("frequency")}
          >
            词频统计
          </ToolButton>
          <ToolButton
            active={activeTool === "combiner"}
            onClick={() => setActiveTool("combiner")}
          >
            智能组合
          </ToolButton>
        </nav>

        <header className="mb-8 max-w-4xl sm:mb-10">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-700">
            <span className="h-px w-8 bg-teal-500" />
            {copy.eyebrow}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{copy.description}</p>
        </header>

        <div className={activeTool === "frequency" ? "block" : "hidden"}>
          <FrequencyTool />
        </div>
        <div className={activeTool === "combiner" ? "block" : "hidden"}>
          <KeywordCombiner />
        </div>
      </div>
    </main>
  );
}

function ToolButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors ${
        active ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}
