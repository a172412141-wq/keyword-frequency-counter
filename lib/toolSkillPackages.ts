export type ToolSkillCategory = "amazon" | "business" | "keyword" | "system";

export type ToolSkillDeployKind =
  | "next-fastapi"
  | "streamlit"
  | "next-panel"
  | "skill-only";

export type ToolSkillPackage = {
  id: string;
  skillName: string;
  title: string;
  category: ToolSkillCategory;
  deployKind: ToolSkillDeployKind;
  deployLabel: string;
  description: string;
  trigger: string;
  localUrl?: string;
  installTarget: string;
  sourcePaths: string[];
  privacy: string;
  inputs: string[];
  outputs: string[];
  workflow: string[];
  packageHighlights: string[];
  skillTemplatePath?: string;
  installScript: string;
  runScript: string;
  verifyScript: string;
  standaloneApp?: {
    componentName: string;
    componentPath: string;
    eyebrow: string;
    title: string;
    description: string;
    apiRoutePaths?: string[];
    envNotes?: string[];
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    defaultPort?: number;
    serverExternalPackages?: string[];
  };
};

export const TOOL_SKILL_CATEGORY_LABELS: Record<ToolSkillCategory, string> = {
  amazon: "亚马逊运营",
  business: "经营诊断",
  keyword: "关键词工具",
  system: "系统封装",
};

export const TOOL_SKILL_DEPLOY_LABELS: Record<ToolSkillDeployKind, string> = {
  "next-fastapi": "Next + FastAPI",
  streamlit: "Streamlit 本地应用",
  "next-panel": "独立 Next 面板",
  "skill-only": "Skill 工作流",
};

const NEXT_PANEL_INSTALL = `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SKILL_DIR/assets/source"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install
else
  npm install
fi
`;

const NEXT_PANEL_RUN = `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SKILL_DIR/assets/source"
PORT="\${PORT:-3000}"
if command -v pnpm >/dev/null 2>&1; then
  exec pnpm dev --hostname 127.0.0.1 --port "$PORT"
else
  exec npm run dev -- --hostname 127.0.0.1 --port "$PORT"
fi
`;

const NEXT_PANEL_VERIFY = `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SKILL_DIR/assets/source"
if command -v pnpm >/dev/null 2>&1; then
  pnpm build
else
  npm run build
fi
`;

const AMAZON_REVIEW_PANEL_RUN = `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SKILL_DIR/assets/source"
PORT="\${PORT:-3011}"
if command -v pnpm >/dev/null 2>&1; then
  exec pnpm dev --hostname 127.0.0.1 --port "$PORT"
else
  exec npm run dev -- --hostname 127.0.0.1 --port "$PORT"
fi
`;

export const TOOL_SKILL_PACKAGES: ToolSkillPackage[] = [
  {
    id: "amazon-review-analyzer",
    skillName: "amazon-review-analyzer",
    title: "Amazon 评论批量分析",
    category: "amazon",
    deployKind: "next-panel",
    deployLabel: TOOL_SKILL_DEPLOY_LABELS["next-panel"],
    description:
      "批量导入 Amazon ASIN，逐个采集、清洗和分析书面评论，并为每个 ASIN 输出含 PDF、Word、CSV 与 JSON 的独立 ZIP。",
    trigger: "用 amazon-review-analyzer 批量分析这些 ASIN 的评论并生成报告包",
    localUrl: "http://127.0.0.1:3011",
    installTarget: "~/.codex/skills/amazon-review-analyzer",
    skillTemplatePath: "skills/amazon-review-analyzer",
    sourcePaths: [
      "components/AmazonReviewBatchPanel.tsx",
      "lib/reviewBatch.ts",
      "lib/server/amazonReviewAnalyzer.ts",
      "lib/server/reviewReportDocuments.ts",
      "lib/server/assets/report-font.ttf",
      "lib/server/zipArchive.ts",
      "app/api/review-analysis",
      "types/fontkit.d.ts",
    ],
    privacy: "ASIN 清单、评论样本和生成的分析文件默认只在本机 Next.js 进程中处理。",
    inputs: ["单个或批量 ASIN", "Amazon 商品链接", "包含 ASIN 的 CSV / TXT"],
    outputs: [
      "每个 ASIN 一份独立 ZIP",
      "中文 PDF 与可编辑 Word 分析报告",
      "Markdown、评论 CSV、指标 JSON 与产品机会 CSV",
    ],
    workflow: [
      "粘贴 ASIN、Amazon 链接或导入 CSV/TXT",
      "选择快速、标准或最大化采集模式",
      "逐个采集评论并分析低星痛点、高星价值点和产品机会",
      "分别下载每个 ASIN 的 PDF/Word 数据包",
    ],
    packageHighlights: [
      "批量 ASIN 前端与任务状态",
      "评论采集、去重和主题分析源码",
      "中文 PDF/DOCX 报告生成器",
      "Windows/macOS 安装与本地部署脚本",
      "Codex Skill 元数据和部署参考",
    ],
    installScript: NEXT_PANEL_INSTALL,
    runScript: AMAZON_REVIEW_PANEL_RUN,
    verifyScript: NEXT_PANEL_VERIFY,
    standaloneApp: {
      componentName: "AmazonReviewBatchPanel",
      componentPath: "@/components/AmazonReviewBatchPanel",
      eyebrow: "AMAZON REVIEW INTELLIGENCE",
      title: "ASIN 批量评论分析",
      description: "批量导入 ASIN，逐个采集和分析评论，并为每个 ASIN 生成含 PDF 与 Word 的独立报告包。",
      apiRoutePaths: ["app/api/review-analysis/[asin]/route.ts"],
      envNotes: [
        "默认端口为 3011，可通过 PORT 环境变量或脚本参数覆盖。",
        "PDF/Word 生成需要系统存在可用的中文字体。",
        "采集依赖本机访问公开评论接口的网络能力。",
      ],
      dependencies: {
        docx: "^9.7.1",
        fontkit: "^2.0.4",
        pdfkit: "^0.19.1",
      },
      devDependencies: {
        "@types/pdfkit": "^0.17.6",
      },
      defaultPort: 3011,
      serverExternalPackages: ["fontkit", "pdfkit"],
    },
  },
  {
    id: "amazon-title-optimizer",
    skillName: "amazon-title-optimizer",
    title: "Listing 文案合规优化",
    category: "amazon",
    deployKind: "next-fastapi",
    deployLabel: TOOL_SKILL_DEPLOY_LABELS["next-fastapi"],
    description:
      "Amazon Listing 标题、五点和 A+ 文案检查工具，支持单条优化和 Excel 批量优化，输出合规标签与改写建议。",
    trigger: "用 amazon-title-optimizer 批量优化这些 Amazon Listing 文案",
    localUrl: "http://127.0.0.1:3010",
    installTarget: "~/.codex/skills/amazon-title-optimizer",
    sourcePaths: ["amazon-title-optimizer"],
    privacy: "Listing 草稿和批量 Excel 默认在本机后端处理；不需要外部 API。",
    inputs: ["单条标题、品牌、品类、五点和 A+ 草稿", "包含 Title 列的 .xlsx 批量文件"],
    outputs: ["合规状态", "问题标签", "优化标题", "五点和 A+ 结构建议"],
    workflow: [
      "启动 FastAPI 后端和 Next 前端",
      "单条输入或上传 Excel",
      "检查标题长度、促销词、符号噪音、堆词和结构风险",
      "复制或导出优化建议",
    ],
    packageHighlights: ["后端优化引擎", "Next 前端", "Docker 配置", "Codex Skill 元数据", "本地部署脚本"],
    installScript: `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$SKILL_DIR/assets/source/amazon-title-optimizer"
cd "$ROOT/backend"
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cd "$ROOT/frontend"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install
else
  npm install
fi
`,
    runScript: `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$SKILL_DIR/assets/source/amazon-title-optimizer"
BACKEND_PORT="\${BACKEND_PORT:-8010}"
FRONTEND_PORT="\${FRONTEND_PORT:-3010}"
cd "$ROOT/backend"
./.venv/bin/uvicorn main:app --host 127.0.0.1 --port "$BACKEND_PORT" &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT
cd "$ROOT/frontend"
export NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:$BACKEND_PORT"
if command -v pnpm >/dev/null 2>&1; then
  exec pnpm dev --hostname 127.0.0.1 --port "$FRONTEND_PORT"
else
  exec npm run dev -- --hostname 127.0.0.1 --port "$FRONTEND_PORT"
fi
`,
    verifyScript: `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$SKILL_DIR/assets/source/amazon-title-optimizer"
cd "$ROOT/backend"
./.venv/bin/python -m compileall .
cd "$ROOT/frontend"
if command -v pnpm >/dev/null 2>&1; then
  pnpm build
else
  npm run build
fi
`,
  },
  {
    id: "fang-business-analysis",
    skillName: "fang-business-analysis",
    title: "经营分析",
    category: "business",
    deployKind: "streamlit",
    deployLabel: TOOL_SKILL_DEPLOY_LABELS.streamlit,
    description:
      "亚马逊库存、利润、广告和补货 Excel 的本地 Streamlit 经营分析工具，输出 SKU 角色、父体结构、SPU/品线问题和动作建议。",
    trigger: "用 fang-business-analysis 分析这份库存利润经营数据",
    localUrl: "http://127.0.0.1:8501",
    installTarget: "~/.codex/skills/fang-business-analysis",
    sourcePaths: ["business-analysis"],
    privacy: "库存、利润、广告和补货数据默认只在本机 Streamlit 进程内读取。",
    inputs: ["补货、库存、广告、利润 Excel", "SKU / 父体 / SPU / 品线字段"],
    outputs: ["经营总览", "SKU 角色", "父体/SPU/品线诊断", "Excel 报告"],
    workflow: [
      "上传经营相关 Excel",
      "完成字段校验和中文字段映射",
      "查看 SKU、父体、SPU 和品线诊断",
      "导出经营动作报告",
    ],
    packageHighlights: ["Streamlit 应用", "Fang 诊断模块", "字段映射和阈值配置", "Codex Skill 元数据"],
    installScript: `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SKILL_DIR/assets/source/business-analysis"
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
`,
    runScript: `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SKILL_DIR/assets/source/business-analysis"
PORT="\${PORT:-8501}"
exec ./.venv/bin/streamlit run app.py --server.address 127.0.0.1 --server.port "$PORT"
`,
    verifyScript: `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SKILL_DIR/assets/source/business-analysis"
./.venv/bin/python -m pytest -q
`,
  },
  {
    id: "fang-weekly-doc-reader",
    skillName: "fang-weekly-doc-reader",
    title: "周会文档读取",
    category: "business",
    deployKind: "next-panel",
    deployLabel: TOOL_SKILL_DEPLOY_LABELS["next-panel"],
    description:
      "飞书周会文档读取和归档工具，搜索文档、读取正文、提取阶段/KPI/红线/动作信号，并沉淀 Fang 经营规则候选。",
    trigger: "用 fang-weekly-doc-reader 看这份飞书周会文档",
    localUrl: "http://127.0.0.1:3000",
    installTarget: "~/.codex/skills/fang-weekly-doc-reader",
    sourcePaths: [
      "components/WeeklyDocReaderPanel.tsx",
      "components/icons.tsx",
      "app/api/weekly-doc",
      "skills/fang-weekly-doc-reader",
    ],
    privacy: "飞书文档内容通过本机 lark-cli 读取，归档写入本地 Skill 目录。",
    inputs: ["飞书文档 URL 或 token", "搜索词", "会议日期", "关键词精读条件"],
    outputs: ["周会摘要", "KPI/红线/动作信号", "可沉淀规则候选", "本地归档文件"],
    workflow: [
      "确认 lark-cli 已按用户身份授权",
      "搜索或粘贴飞书周会文档",
      "读取文档正文和大纲",
      "生成结构化会议信号并归档",
    ],
    packageHighlights: ["独立 Next 页面", "飞书读取 API Route", "既有 Skill 参考资料", "本地部署脚本"],
    installScript: NEXT_PANEL_INSTALL,
    runScript: NEXT_PANEL_RUN,
    verifyScript: NEXT_PANEL_VERIFY,
    standaloneApp: {
      componentName: "WeeklyDocReaderPanel",
      componentPath: "@/components/WeeklyDocReaderPanel",
      eyebrow: "FEISHU WEEKLY REVIEW",
      title: "周会文档读取",
      description: "搜索、读取和归档飞书周会文档，提取 Fang 经营模型需要的阶段、KPI、红线和动作信号。",
      apiRoutePaths: ["app/api/weekly-doc"],
      envNotes: ["可选：LARK_CLI_PATH 指向本机 lark-cli"],
    },
  },
  {
    id: "asin-competitor-analyzer",
    skillName: "asin-competitor-analyzer",
    title: "ASIN 竞对快速分析",
    category: "amazon",
    deployKind: "next-panel",
    deployLabel: TOOL_SKILL_DEPLOY_LABELS["next-panel"],
    description:
      "浏览器本地 ASIN 竞对分组工具，按外观相关性、价格段、小类排名、Rating 数量和评分分入 5 个竞对区间。",
    trigger: "用 asin-competitor-analyzer 给这批 ASIN 做竞对分层",
    localUrl: "http://127.0.0.1:3000",
    installTarget: "~/.codex/skills/asin-competitor-analyzer",
    sourcePaths: [
      "components/AsinCompetitorAnalyzerPanel.tsx",
      "lib/asinCompetitorAnalyzer.ts",
      "lib/clipboard.ts",
    ],
    privacy: "ASIN、竞品数据和卖家精灵导出文本只在浏览器本地处理。",
    inputs: ["我方 ASIN", "竞品 ASIN 列表", "卖家精灵或类似工具导出的竞品指标"],
    outputs: ["5 档竞对分组", "CSV", "可复制的 ASIN 批量清单"],
    workflow: [
      "第一行输入我方 ASIN，其后输入竞品 ASIN",
      "粘贴竞品插件导出的标题、价格、排名、评论数和评分",
      "按竞争强弱和相关性分组",
      "导出 CSV 或复制结果到 Excel",
    ],
    packageHighlights: ["独立 Next 页面", "本地分析算法", "CSV 导出逻辑", "Codex Skill 元数据"],
    installScript: NEXT_PANEL_INSTALL,
    runScript: NEXT_PANEL_RUN,
    verifyScript: NEXT_PANEL_VERIFY,
    standaloneApp: {
      componentName: "AsinCompetitorAnalyzerPanel",
      componentPath: "@/components/AsinCompetitorAnalyzerPanel",
      eyebrow: "ASIN COMPETITOR ANALYZER",
      title: "ASIN 竞对快速分析",
      description: "把 ASIN 和竞品指标分成强相关、高竞争、低竞争、弱相关和不相关 5 个区间。",
    },
  },
  {
    id: "keyword-frequency-counter",
    skillName: "keyword-frequency-counter",
    title: "关键词词频统计",
    category: "keyword",
    deployKind: "next-panel",
    deployLabel: TOOL_SKILL_DEPLOY_LABELS["next-panel"],
    description:
      "浏览器本地关键词词频统计工具，支持单词根、双词根和三词根统计，适合亚马逊关键词池清洗和词根判断。",
    trigger: "用 keyword-frequency-counter 统计这些关键词的词频",
    localUrl: "http://127.0.0.1:3000",
    installTarget: "~/.codex/skills/keyword-frequency-counter",
    sourcePaths: [
      "components/FrequencyTool.tsx",
      "components/FrequencyTable.tsx",
      "components/SummaryCards.tsx",
      "components/TextInput.tsx",
      "components/NgramSelector.tsx",
      "components/ActionButtons.tsx",
      "components/icons.tsx",
      "lib/wordFrequency.ts",
      "lib/export.ts",
    ],
    privacy: "关键词输入只在浏览器本地统计。",
    inputs: ["多行关键词", "N-gram 统计尺寸"],
    outputs: ["词频表", "占比", "CSV", "可粘贴到 Excel 的表格文本"],
    workflow: [
      "粘贴多行关键词",
      "选择单词根、双词根或三词根",
      "统计出现次数和占比",
      "复制或导出 CSV",
    ],
    packageHighlights: ["独立 Next 页面", "词频统计算法", "导出工具", "Codex Skill 元数据"],
    installScript: NEXT_PANEL_INSTALL,
    runScript: NEXT_PANEL_RUN,
    verifyScript: NEXT_PANEL_VERIFY,
    standaloneApp: {
      componentName: "FrequencyTool",
      componentPath: "@/components/FrequencyTool",
      eyebrow: "KEYWORD FREQUENCY",
      title: "关键词词频统计",
      description: "本地统计关键词词根、双词根和三词根出现次数，快速找出可复用的高频表达。",
    },
  },
  {
    id: "smart-keyword-combiner",
    skillName: "smart-keyword-combiner",
    title: "智能组合关键词",
    category: "keyword",
    deployKind: "next-panel",
    deployLabel: TOOL_SKILL_DEPLOY_LABELS["next-panel"],
    description:
      "亚马逊关键词组合工具，自动识别词根、归一同义词、过滤冲突组合，并保留浏览器本地人工规则库。",
    trigger: "用 smart-keyword-combiner 组合这批亚马逊关键词",
    localUrl: "http://127.0.0.1:3000",
    installTarget: "~/.codex/skills/smart-keyword-combiner",
    sourcePaths: [
      "components/KeywordCombiner.tsx",
      "components/CombinationResults.tsx",
      "components/CombinationSettingsPanel.tsx",
      "components/RootCandidateTable.tsx",
      "components/RootRuleLibrary.tsx",
      "components/icons.tsx",
      "lib/combinationGenerator.ts",
      "lib/conflictRules.ts",
      "lib/csvExport.ts",
      "lib/keywordConfig.ts",
      "lib/keywordNormalizer.ts",
      "lib/keywordTypes.ts",
      "lib/rootExtractor.ts",
      "lib/rootRules.ts",
      "lib/sampleData.ts",
      "lib/synonymRules.ts",
      "lib/clipboard.ts",
    ],
    privacy: "关键词、人工修正和规则库默认只保存在浏览器本地。",
    inputs: ["多行关键词", "人工词根修正", "组合模式和输出格式"],
    outputs: ["自然组合关键词", "词根候选", "本地规则库", "CSV"],
    workflow: [
      "粘贴关键词池",
      "检查系统识别出的词根和类别",
      "保存人工修正到本地规则库",
      "生成并导出组合关键词",
    ],
    packageHighlights: ["独立 Next 页面", "词根识别算法", "冲突和同义词规则", "Codex Skill 元数据"],
    installScript: NEXT_PANEL_INSTALL,
    runScript: NEXT_PANEL_RUN,
    verifyScript: NEXT_PANEL_VERIFY,
    standaloneApp: {
      componentName: "KeywordCombiner",
      componentPath: "@/components/KeywordCombiner",
      eyebrow: "SMART KEYWORD COMBINER",
      title: "智能组合关键词",
      description: "识别词根、合并同义表达、过滤冲突组合，并生成适合亚马逊场景的关键词组合。",
    },
  },
  {
    id: "fang-business-diagnostic-model",
    skillName: "fang-business-diagnostic",
    title: "Fang 经营关系诊断模型",
    category: "business",
    deployKind: "skill-only",
    deployLabel: TOOL_SKILL_DEPLOY_LABELS["skill-only"],
    description:
      "Fang 经营关系诊断模型 Skill，按阶段、SKU/父体/SPU/品线关系、利润、断货、库存、现金流和扩品红线输出经营动作。",
    trigger: "用 fang-business-diagnostic 分析这个 SKU / 父体 / 品线",
    installTarget: "~/.codex/skills/fang-business-diagnostic",
    sourcePaths: ["skills/fang-business-diagnostic"],
    privacy: "作为 Codex Skill 使用；业务数据只在当前 Codex 会话和本地文件中处理。",
    inputs: ["SKU、父体、SPU 或品线经营数据", "订单、毛利、退货、库存、补货和现金流信号"],
    outputs: ["阶段判断", "经营关系错配", "红线动作", "可执行建议"],
    workflow: [
      "先判断项目阶段",
      "再诊断 SKU、父体、SPU 和品线关系",
      "按利润、断货、库存和现金流红线排序",
      "输出动作和验证口径",
    ],
    packageHighlights: ["既有 SKILL.md", "模型参考文档", "agents/openai.yaml", "安装检查脚本"],
    installScript: `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
echo "Skill is ready at $SKILL_DIR"
echo "Install target: ~/.codex/skills/fang-business-diagnostic"
`,
    runScript: `#!/usr/bin/env bash
set -euo pipefail
echo "This is a Codex workflow Skill. Open Codex and say:"
echo "用 fang-business-diagnostic 分析这个 SKU / 父体 / 品线"
`,
    verifyScript: `#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"
test -f "$SKILL_DIR/SKILL.md"
test -f "$SKILL_DIR/agents/openai.yaml"
`,
  },
];

export function findToolSkillPackage(id: string) {
  return TOOL_SKILL_PACKAGES.find((item) => item.id === id);
}

export function skillPackageInstallSnippet(toolPackage: ToolSkillPackage) {
  const archiveName = `${toolPackage.skillName}-one-click.zip`;
  return [
    `下载并解压 ${archiveName}`,
    "Windows：双击“双击安装到Codex-Windows.cmd”",
    "macOS：双击“双击安装到Codex.command”",
    "重新打开 Codex",
  ].join("\n");
}
