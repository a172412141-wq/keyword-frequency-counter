"use client";

import { useState } from "react";
import { AmazonTitleOptimizerPanel } from "@/components/AmazonTitleOptimizerPanel";
import { AmazonReviewBatchPanel } from "@/components/AmazonReviewBatchPanel";
import { AsinCompetitorAnalyzerPanel } from "@/components/AsinCompetitorAnalyzerPanel";
import { BulkDiagnosticPanel } from "@/components/BulkDiagnosticPanel";
import { BusinessAnalysisPanel } from "@/components/BusinessAnalysisPanel";
import { FrequencyTool } from "@/components/FrequencyTool";
import { KeywordCombiner } from "@/components/KeywordCombiner";
import { SkillHub } from "@/components/SkillHub";
import { SkillPackager } from "@/components/SkillPackager";
import { WeeklyDocReaderPanel } from "@/components/WeeklyDocReaderPanel";

const IS_PUBLIC_DEPLOYMENT = process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "public";
const PUBLIC_REVIEW_SITE = "https://one-sme-amazon-review-analysis.a172412141.chatgpt.site";

type ActiveSection =
  | "skills"
  | "packager"
  | "bulk"
  | "title"
  | "reviews"
  | "competitor"
  | "business"
  | "weekly"
  | "frequency"
  | "combiner";

const TOOL_COPY = {
  skills: {
    eyebrow: "UNIFIED SKILL HUB",
    title: "1SME Skill 平台",
    description: "把当前项目、个人技能库和系统技能收进同一个入口，按场景检索、筛选和调用。",
  },
  packager: {
    eyebrow: "LOCAL SKILL PACKAGER",
    title: "Skill 封装中心",
    description: "把每个工具整理成可下载的 Codex Skill 包，内置源码、元数据、本地部署说明和启动脚本。",
  },
  bulk: {
    eyebrow: "BULK AD DIAGNOSTICS",
    title: "Bulk 表分析",
    description: "上传 Amazon Ads Bulk，筛选 ASIN、SKU、Campaign 或 Portfolio，生成广告诊断工作簿。",
  },
  title: {
    eyebrow: "AMAZON LISTING OPTIMIZER",
    title: "Listing 文案合规优化",
    description: "单条或批量检查 Amazon 标题、五点和 A+ 文案风险，输出问题标签、优化标题和版式建议。",
  },
  reviews: {
    eyebrow: "AMAZON REVIEW INTELLIGENCE",
    title: "ASIN 批量评论分析",
    description: "批量导入 ASIN，逐个采集、去重和分析书面评论，并为每个 ASIN 生成独立下载包。",
  },
  competitor: {
    eyebrow: "AMAZON ASIN COMPETITOR ANALYZER",
    title: "ASIN 竞对快速分析",
    description: "按外观相关性、价格段、小类排名、Rating 数量和评星，把竞品 ASIN 分入 5 个竞对区间。",
  },
  business: {
    eyebrow: "BUSINESS OPERATIONS ANALYSIS",
    title: "经营分析",
    description: "上传库存、利润、广告和补货表，判断 SKU 角色、父体结构、SPU/品线问题和经营动作。",
  },
  weekly: {
    eyebrow: "FEISHU WEEKLY REVIEW READER",
    title: "周会经营快速诊断",
    description: "粘贴飞书文档链接，自动读取周会内容，按 Fang 阶段模型诊断 KPI、经营关系、红线和下一步动作。",
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
        {IS_PUBLIC_DEPLOYMENT ? (
          <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4 text-sm text-teal-950 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <div className="font-bold">公网版已连接在线服务</div>
              <p className="mt-1 leading-6 text-teal-800">
                评论分析、Bulk 托管版、竞对分析和关键词工具可直接使用；涉及本机文件、飞书授权或本地服务的模块会明确标注。
              </p>
            </div>
            <a
              href={PUBLIC_REVIEW_SITE}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-teal-700 px-4 font-semibold text-white transition hover:bg-teal-800"
            >
              打开变体评论研究站
            </a>
          </section>
        ) : null}

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
            active={activeSection === "packager"}
            onClick={() => setActiveSection("packager")}
          >
            Skill封装
          </ToolButton>
          <ToolButton
            active={activeSection === "bulk"}
            onClick={() => setActiveSection("bulk")}
          >
            Bulk表分析
          </ToolButton>
          <ToolButton
            active={activeSection === "title"}
            onClick={() => setActiveSection("title")}
          >
            Listing优化
          </ToolButton>
          <ToolButton
            active={activeSection === "reviews"}
            onClick={() => setActiveSection("reviews")}
          >
            评论分析
          </ToolButton>
          <ToolButton
            active={activeSection === "competitor"}
            onClick={() => setActiveSection("competitor")}
          >
            竞对分析
          </ToolButton>
          <ToolButton
            active={activeSection === "business"}
            onClick={() => setActiveSection("business")}
          >
            经营分析
          </ToolButton>
          <ToolButton
            active={activeSection === "weekly"}
            onClick={() => setActiveSection("weekly")}
          >
            周会诊断
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
          {!IS_PUBLIC_DEPLOYMENT ? (
            <a
              href="./admin"
              className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              管理员
            </a>
          ) : null}
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

        {activeSection === "skills" ? <SkillHub /> : null}
        {activeSection === "packager" ? (
          IS_PUBLIC_DEPLOYMENT ? (
            <LocalOnlyNotice module="Skill 封装中心" reason="需要读取本机源码并生成安装包" />
          ) : (
            <SkillPackager />
          )
        ) : null}
        {activeSection === "bulk" ? <BulkDiagnosticPanel /> : null}
        {activeSection === "title" ? (
          IS_PUBLIC_DEPLOYMENT ? (
            <LocalOnlyNotice module="Listing 文案合规优化" reason="需要本机优化服务处理 Excel 和文案" />
          ) : (
            <AmazonTitleOptimizerPanel />
          )
        ) : null}
        {activeSection === "reviews" ? <AmazonReviewBatchPanel /> : null}
        {activeSection === "competitor" ? <AsinCompetitorAnalyzerPanel /> : null}
        {activeSection === "business" ? (
          IS_PUBLIC_DEPLOYMENT ? (
            <LocalOnlyNotice module="经营分析" reason="经营表格默认只在你的本机处理" />
          ) : (
            <BusinessAnalysisPanel />
          )
        ) : null}
        {activeSection === "weekly" ? (
          IS_PUBLIC_DEPLOYMENT ? (
            <LocalOnlyNotice module="周会经营快速诊断" reason="需要你的飞书授权和本机归档目录" />
          ) : (
            <WeeklyDocReaderPanel />
          )
        ) : null}
        {activeSection === "frequency" ? <FrequencyTool /> : null}
        {activeSection === "combiner" ? <KeywordCombiner /> : null}
      </div>
    </main>
  );
}

function LocalOnlyNotice({ module, reason }: { module: string; reason: string }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">LOCAL ONLY</div>
      <h2 className="mt-2 text-xl font-bold text-slate-950">{module} 请在本地平台使用</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
        {reason}，因此公网版不会上传或代管这部分数据。请在你的 Mac 上双击“启动1SME工具平台”后使用完整功能。
      </p>
    </section>
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
