export type FangStage = "0-10" | "10-30" | "30-60" | "60-100" | "未明确";

export type DiagnosticItem = {
  level: "正常" | "关注" | "红线" | "待确认";
  category: string;
  finding: string;
  evidence: string[];
};

export type FangWeeklyDiagnosis = {
  stage: FangStage;
  stageEvidence: string[];
  confidence: "高" | "中" | "低";
  mainConflict: string;
  kpiMismatch: string[];
  relationshipFindings: string[];
  redLineChecks: DiagnosticItem[];
  immediateActions: string[];
  weeklyChecks: string[];
  forbiddenActions: string[];
  upgradeOrStopConditions: string[];
  missingData: string[];
};

const STAGES: FangStage[] = ["0-10", "10-30", "30-60", "60-100"];

const STAGE_RULES: Record<Exclude<FangStage, "未明确">, {
  conflict: string;
  kpis: string[];
  forbidden: string[];
  upgrade: string[];
}> = {
  "0-10": {
    conflict: "先验证真实订单、真实贡献毛利和履约链路是否跑通，不追求规模。",
    kpis: ["单笔真实贡献毛利", "首轮真实订单", "退货/售后异常", "履约跑通率", "补货周期"],
    forbidden: ["不要把 GMV 当作唯一目标", "真实毛利未算清前不要扩量", "首轮测试期不要盲目扩 SKU"],
    upgrade: ["真实订单形成且单笔真实贡献毛利为正", "履约与售后链路跑通", "出现连续销售或可预测补货信号"],
  },
  "10-30": {
    conflict: "验证单个 SKU 能否持续稳定销售，同时控制退货、缺货和活动后利润。",
    kpis: ["14 天日均销量", "退货率", "缺货率", "库存覆盖天数", "活动后真实毛利"],
    forbidden: ["不要因短期 GMV 增长快速扩 SKU", "不要忽略退货率和缺货预测", "没有利润红线不要参加活动"],
    upgrade: ["主 SKU 连续稳定销售 14–30 天", "库存覆盖和退货率可控", "关联 SKU 与主 SKU 同供应链且不挤占补货资金"],
  },
  "30-60": {
    conflict: "在不伤害主 SKU 和现金周转的前提下，复制同供应链的关联 SKU。",
    kpis: ["关联 SKU 订单占比", "主 SKU 库存稳定性", "父体/品线利润额", "库存周转天数", "资金占用"],
    forbidden: ["不要跨陌生供应链扩张", "周转恶化时不要继续扩 SKU", "低效 SKU 不得挤占主 SKU 补货资金"],
    upgrade: ["至少 3 个 SKU 稳定销售", "至少 1 个主 SKU 清晰", "品线利润为正且周转、现金回收可控"],
  },
  "60-100": {
    conflict: "形成小类目 SKU 矩阵，确保规模增长同时带来利润和现金回收。",
    kpis: ["稳定销售 SKU 数", "父体/品线 GMV", "父体/品线利润", "库存周转天数", "现金回收周期"],
    forbidden: ["不要只看 GMV 忽略利润", "库存增长不能快于利润增长", "现金流不稳时不要继续放大规模"],
    upgrade: ["核心、利润、流量和防御 SKU 分工清晰", "A/B/C 库存与资金分配稳定", "供应链与活动承接能力可持续"],
  },
};

const CHECKS = [
  { category: "利润", negative: ["负毛利", "贡献毛利为负", "连续亏损", "亏损7天", "亏损 7 天"], normal: ["贡献毛利为正", "利润为正", "毛利为正"] },
  { category: "缺货", negative: ["即将断货", "断货风险", "缺货风险", "7天内断货", "7 天内断货"], normal: ["库存稳定", "无断货", "缺货可控"] },
  { category: "退货", negative: ["退货率超", "退货异常", "售后异常", "连续两周退货"], normal: ["退货率稳定", "退货可控"] },
  { category: "库存", negative: ["周转恶化", "库存积压", "高库存", "滞销", "库龄过长"], normal: ["周转可控", "库存健康", "覆盖天数可控"] },
  { category: "现金流", negative: ["资金缺口", "现金流紧张", "补货资金不足", "资金无法覆盖"], normal: ["现金流稳定", "资金可覆盖", "现金回收可控"] },
  { category: "扩张", negative: ["主sku不稳定", "主 sku 不稳定", "暂停扩品", "禁止扩品", "不可扩"], normal: ["主sku稳定", "主 sku 稳定", "具备扩品条件"] },
] as const;

export function diagnoseFangWeeklyDoc(content: string): FangWeeklyDiagnosis {
  const lines = cleanLines(content);
  const explicitStages = STAGES.filter((stage) => content.includes(stage));
  const stage = explicitStages.length === 1 ? explicitStages[0] : inferStage(content);
  const stageEvidence = stage === "未明确"
    ? []
    : takeEvidence(lines, [stage, ...STAGE_RULES[stage].kpis], 4);
  const redLineChecks = CHECKS.map((check) => {
    const negative = takeEvidence(lines, check.negative, 3);
    const normal = takeEvidence(lines, check.normal, 3);
    return {
      level: negative.length ? "红线" : normal.length ? "正常" : "待确认",
      category: check.category,
      finding: negative.length
        ? `${check.category}出现红线信号，需在继续补货或扩张前核实。`
        : normal.length
          ? `${check.category}在文档中出现正向或可控信号。`
          : `文档未提供足够的${check.category}判断数据。`,
      evidence: negative.length ? negative : normal,
    } satisfies DiagnosticItem;
  });

  const rules = stage === "未明确" ? null : STAGE_RULES[stage];
  const kpiMismatch = detectKpiMismatch(content, stage);
  const relationshipFindings = collectRelationships(lines);
  const redCategories = redLineChecks.filter((item) => item.level === "红线").map((item) => item.category);

  return {
    stage,
    stageEvidence,
    confidence: explicitStages.length === 1 ? "高" : stage === "未明确" ? "低" : "中",
    mainConflict: rules?.conflict ?? "阶段证据不足：先补齐订单、真实贡献毛利、退货、库存、补货和现金流数据，再确定主矛盾。",
    kpiMismatch,
    relationshipFindings,
    redLineChecks,
    immediateActions: buildActions(redCategories, stage),
    weeklyChecks: rules?.kpis ?? ["真实贡献毛利", "订单连续性", "退货率", "库存覆盖天数", "补货周期", "现金缺口"],
    forbiddenActions: rules?.forbidden ?? ["阶段未明确前不要只按 GMV 排名", "关键红线未核实前不要扩大补货或扩 SKU"],
    upgradeOrStopConditions: rules?.upgrade ?? ["补齐阶段数据后再设置升级条件", "若真实贡献毛利持续为负，立即暂停补货并重算成本"],
    missingData: detectMissingData(content),
  };
}

function inferStage(content: string): FangStage {
  const value = content.toLowerCase();
  if (/矩阵|小类目|3[-–—~至]5个.*sku|多个稳定.*sku/.test(value)) return "60-100";
  if (/关联sku|关联 sku|扩品|复制|父体|品线/.test(value) && /主sku|主 sku|稳定/.test(value)) return "30-60";
  if (/14天|14 天|稳定订单|连续销售|补货日历|日均销量/.test(value)) return "10-30";
  if (/首单|首轮|测试期|验证期|履约跑通|真实订单/.test(value)) return "0-10";
  return "未明确";
}

function detectKpiMismatch(content: string, stage: FangStage) {
  const findings: string[] = [];
  if ((stage === "0-10" || stage === "10-30") && /gmv|销售额/i.test(content)) {
    findings.push("文档强调 GMV/销售额；当前阶段应优先验证真实贡献毛利、订单稳定性、退货和履约。 ");
  }
  if (/毛利率/.test(content) && !/贡献毛利|物流|平台费|退货.*成本|活动.*折扣/.test(content)) {
    findings.push("只看到毛利率，尚未看到扣除平台费、物流、退货准备和活动折扣后的真实贡献毛利。 ");
  }
  if (/扩品|扩张|上新/.test(content) && !/周转|现金|补货资金|主sku稳定|主 sku 稳定/.test(content)) {
    findings.push("出现扩品/扩张动作，但缺少主 SKU 稳定性、周转和补货资金约束。 ");
  }
  return findings.length ? findings.map((item) => item.trim()) : ["未识别到明显 KPI 错位；仍需结合完整指标表复核。"];
}

function collectRelationships(lines: string[]) {
  const evidence = takeEvidence(lines, ["sku", "父体", "品线", "价格带", "供应链", "广告", "库存", "利润", "主推", "流量款", "利润款"], 8);
  return evidence.length ? evidence : ["文档未呈现足够的 SKU、父体、品线、价格带或供应链关系信息。"];
}

function buildActions(redCategories: string[], stage: FangStage) {
  const actions: string[] = [];
  if (redCategories.includes("利润")) actions.push("暂停相关 SKU 补货，重算价格、平台费、物流、退货准备和活动折扣后的真实贡献毛利。");
  if (redCategories.includes("缺货")) actions.push("暂停非核心扩张，优先保障 A 类/主 SKU 的补货与履约。");
  if (redCategories.includes("退货")) actions.push("拆解退货原因，核查质量、包装、图片描述与用户预期差距。");
  if (redCategories.includes("库存")) actions.push("冻结新增扩品，先清理低效 SKU 并恢复库存周转。");
  if (redCategories.includes("现金流")) actions.push("压缩非核心库存，优先保障未来 4 周高周转、高利润 SKU 的补货资金。");
  if (redCategories.includes("扩张")) actions.push("主 SKU 模型稳定前，不进入新供应链、新类目或新价格带。");
  if (!actions.length) actions.push(stage === "未明确" ? "先补齐关键指标并确认经营阶段，再决定补货、扩品或止损。" : `围绕 ${stage} 阶段 KPI 建立本周负责人、截止时间和复验口径。`);
  return actions;
}

function detectMissingData(content: string) {
  const fields = [
    ["时间窗口", ["本周", "上周", "近7天", "近 7 天", "近14天", "近 14 天", "日期"]],
    ["SKU/父体/品线结构", ["sku", "父体", "品线"]],
    ["订单与 GMV", ["订单", "gmv", "销售额"]],
    ["真实贡献毛利", ["贡献毛利"]],
    ["退货率及原因", ["退货率", "退货原因"]],
    ["库存覆盖与缺货预测", ["覆盖天数", "缺货", "断货"]],
    ["补货周期", ["补货周期", "交期"]],
    ["未来 4 周补货资金", ["4周", "4 周", "补货资金", "现金流"]],
  ] as const;
  const lower = content.toLowerCase();
  return fields.filter(([, keywords]) => !keywords.some((keyword) => lower.includes(keyword))).map(([label]) => label);
}

function cleanLines(content: string) {
  return Array.from(new Set(content.split(/\r?\n/).map((line) => line.replace(/<[^>]+>/g, "").replace(/^[-*#>\s]+/, "").replace(/\s+/g, " ").trim()).filter((line) => line.length >= 4 && line.length <= 220)));
}

function takeEvidence(lines: string[], keywords: readonly string[], limit: number) {
  return lines.filter((line) => keywords.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase()))).slice(0, limit);
}
