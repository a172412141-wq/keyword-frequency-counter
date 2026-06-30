"use client";

import { useState } from "react";
import { BulkDiagnosticPanel } from "@/components/BulkDiagnosticPanel";
import { BusinessAnalysisPanel } from "@/components/BusinessAnalysisPanel";
import { FrequencyTool } from "@/components/FrequencyTool";
import { KeywordCombiner } from "@/components/KeywordCombiner";
import { SkillHub } from "@/components/SkillHub";

type ActiveSection = "skills" | "bulk" | "business" | "frequency" | "combiner";

const TOOL_COPY = {
  skills: {
    eyebrow: "UNIFIED SKILL HUB",
    title: "1SME Skill 平台",
    description: "把当前项目、个人技能库和系统技能收进同一个入口，按场景检索、筛选和调用。",
  },
  bulk: {
    eyebrow: "BULK AD DIAGNOSTICS",
    title: "Bulk 表分析",
    description: "上传 Amazon Ads Bulk，筛选 ASIN、SKU、Campaign 或 Portfolio，生成广告诊断工作簿。",
  },
  business: {
    eyebrow: "BUSINESS OPERATIONS ANALYSIS",
    title: "经营分析",
    description: "上传库存、利润、广告和补货表，判断 SKU 角色、父体结构、SPU/品线问题和经营动作。",
  },
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
  const [activeSection, setActiveSection] = useState<ActiveSection>("skills");
  const copy = TOOL_COPY[activeSection];

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav
          aria-label="平台模块切换"
          className="mb-8 flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:inline-flex sm:w-auto"
        >
          <ToolButton
            active={activeSection === "skills"}
            onClick={() => setActiveSection("skills")}
          >
            Skill Hub
          </ToolButton>
          <ToolButton
            active={activeSection === "bulk"}
            onClick={() => setActiveSection("bulk")}
          >
            Bulk表分析
          </ToolButton>
          <ToolButton
            active={activeSection === "business"}
            onClick={() => setActiveSection("business")}
          >
            经营分析
          </ToolButton>
          <ToolButton
            active={activeSection === "frequency"}
            onClick={() => setActiveSection("frequency")}
          >
            词频统计
          </ToolButton>
          <ToolButton
            active={activeSection === "combiner"}
            onClick={() => setActiveSection("combiner")}
          >
            智能组合
          </ToolButton>
          <a
            href="./admin"
            className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            管理员
          </a>
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

        <div className={activeSection === "skills" ? "block" : "hidden"}>
          <SkillHub />
        </div>
        <div className={activeSection === "bulk" ? "block" : "hidden"}>
          <BulkDiagnosticPanel />
        </div>
        <div className={activeSection === "business" ? "block" : "hidden"}>
          <BusinessAnalysisPanel />
        </div>
        <div className={activeSection === "frequency" ? "block" : "hidden"}>
          <FrequencyTool />
        </div>
        <div className={activeSection === "combiner" ? "block" : "hidden"}>
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
