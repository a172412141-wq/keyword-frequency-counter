export type SkillCategory =
  | "amazon"
  | "business"
  | "perspective"
  | "system";

export type SkillSource = "workspace" | "personal" | "system";

export type SkillReadiness = "ready" | "needs_config" | "hosted";

export type SkillCatalogItem = {
  name: string;
  category: SkillCategory;
  source: SkillSource;
  readiness: SkillReadiness;
  description: string;
  trigger: string;
  requirement?: string;
  pathHint: string;
};

export const CATEGORY_META: Record<SkillCategory, { label: string; accent: string }> = {
  amazon: { label: "亚马逊运营", accent: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  business: { label: "经营诊断", accent: "bg-sky-50 text-sky-700 ring-sky-100" },
  perspective: { label: "思维顾问", accent: "bg-violet-50 text-violet-700 ring-violet-100" },
  system: { label: "系统与创作", accent: "bg-slate-100 text-slate-700 ring-slate-200" },
};

export const SOURCE_LABELS: Record<SkillSource, string> = {
  workspace: "当前项目",
  personal: "个人技能库",
  system: "系统技能",
};

export const READINESS_LABELS: Record<SkillReadiness, string> = {
  ready: "可直接调用",
  needs_config: "需先配置",
  hosted: "有网页工具",
};

export const SKILL_CATALOG: SkillCatalogItem[] = [
  {
    name: "Flynn1",
    category: "amazon",
    source: "workspace",
    readiness: "ready",
    description: "1SME 本地优先 Bulk 表分析工作流：进度显示、高效率本地部署、隐私优先生成诊断表。",
    trigger: "用 Flynn1 本地处理这份 Bulk 表",
    requirement: "本地 Next 平台、启动器和 Bulk FastAPI 服务；默认不上传私有广告数据。",
    pathHint: "skills/Flynn1",
  },
  {
    name: "bulk-ad-diagnostic-generator",
    category: "amazon",
    source: "workspace",
    readiness: "hosted",
    description: "Amazon Ads Bulk 上传、筛选 ASIN/SKU/Campaign 后生成 8-sheet 广告诊断工作簿。",
    trigger: "帮我用 bulk-ad-diagnostic-generator 处理这份 Bulk",
    requirement: "本地 FastAPI 或 Render 托管服务；涉及广告数据时优先本地处理。",
    pathHint: "bulk-ad-diagnostic-generator/skills/bulk-ad-diagnostic-generator",
  },
  {
    name: "fang-business-diagnostic",
    category: "business",
    source: "workspace",
    readiness: "ready",
    description:
      "Fang 经营关系诊断模型 V0.2：先判阶段，再诊断 SKU/父体/品线关系，检查利润、断货、退货、库存、现金流和扩品红线。",
    trigger: "用 Fang 经营关系诊断模型分析这个 SKU / 父体 / 品线",
    requirement: "需要尽量提供订单、真实贡献毛利、退货、库存覆盖、补货周期、现金流和供应链关系数据。",
    pathHint: "skills/fang-business-diagnostic",
  },
  {
    name: "huashu-nuwa",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "女娲造人：深度调研人物/主题，蒸馏成可运行的人物视角 Skill。",
    trigger: "女娲，帮我蒸馏一个某某的思维方式",
    pathHint: "~/.codex/skills/nuwa-skill",
  },
  {
    name: "andrej-karpathy-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用 Karpathy 的视角分析 AI 技术可靠性、学习方法、行业趋势和产品设计。",
    trigger: "用 Karpathy 的视角看这个 AI 产品",
    pathHint: "~/.codex/skills/nuwa-skill/examples/andrej-karpathy-perspective",
  },
  {
    name: "ilya-sutskever-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用 Ilya 的视角分析 AI 技术方向、安全策略和研究品味。",
    trigger: "用 Ilya 的角度想想这个研究方向",
    pathHint: "~/.codex/skills/nuwa-skill/examples/ilya-sutskever-perspective",
  },
  {
    name: "steve-jobs-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用乔布斯的视角分析产品、审视决策和聚焦体验。",
    trigger: "用乔布斯的视角审一下这个产品",
    pathHint: "~/.codex/skills/nuwa-skill/examples/steve-jobs-perspective",
  },
  {
    name: "paul-graham-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用 Paul Graham 的视角分析创业、写作、产品和人生选择。",
    trigger: "用 PG 的视角看这个创业想法",
    pathHint: "~/.codex/skills/nuwa-skill/examples/paul-graham-perspective",
  },
  {
    name: "feynman-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用费曼的视角检查理解、反自欺和货物崇拜式论证。",
    trigger: "用费曼视角检查我是不是真的理解了",
    pathHint: "~/.codex/skills/nuwa-skill/examples/feynman-perspective",
  },
  {
    name: "munger-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用芒格的视角做逆向思考、认知偏误检查和跨学科分析。",
    trigger: "用芒格视角找这个决策的认知偏误",
    pathHint: "~/.codex/skills/nuwa-skill/examples/munger-perspective",
  },
  {
    name: "naval-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用 Naval 的视角分析杠杆、特定知识、财富和无需许可路径。",
    trigger: "用 Naval 的视角看这件事有没有杠杆",
    pathHint: "~/.codex/skills/nuwa-skill/examples/naval-perspective",
  },
  {
    name: "taleb-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用塔勒布的视角分析极端风险、反脆弱、尾部风险和预防原则。",
    trigger: "用塔勒布视角看这个方案有没有尾部风险",
    pathHint: "~/.codex/skills/nuwa-skill/examples/taleb-perspective",
  },
  {
    name: "elon-musk-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用马斯克的视角拆解成本结构、第一性原理和执行约束。",
    trigger: "用马斯克视角拆一下这个成本结构",
    pathHint: "~/.codex/skills/nuwa-skill/examples/elon-musk-perspective",
  },
  {
    name: "zhang-yiming-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用张一鸣的视角分析产品、组织、全球化、人才和个人成长。",
    trigger: "用张一鸣的思路看这个组织问题",
    pathHint: "~/.codex/skills/nuwa-skill/examples/zhang-yiming-perspective",
  },
  {
    name: "mrbeast-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用 MrBeast 的内容创作系统优化选题、标题、缩略图、Hook 和留存。",
    trigger: "用 MrBeast 的视角优化这个视频标题",
    pathHint: "~/.codex/skills/nuwa-skill/examples/mrbeast-perspective",
  },
  {
    name: "x-mastery-mentor",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "X/Twitter 运营导师，覆盖选题、推文、Thread、增长和 AI 科技赛道策略。",
    trigger: "用 x-mastery-mentor 帮我写一条推文",
    pathHint: "~/.codex/skills/nuwa-skill/examples/x-mastery-mentor",
  },
  {
    name: "zhangxuefeng-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用张雪峰的视角分析教育选择、职业规划和阶层流动。",
    trigger: "用张雪峰视角分析这个专业选择",
    pathHint: "~/.codex/skills/nuwa-skill/examples/zhangxuefeng-perspective",
  },
  {
    name: "trump-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用特朗普视角分析谈判、权力、传播和公开行为预判。",
    trigger: "用特朗普视角分析这场谈判",
    pathHint: "~/.codex/skills/nuwa-skill/examples/trump-perspective",
  },
  {
    name: "sun-yuchen-perspective",
    category: "perspective",
    source: "personal",
    readiness: "ready",
    description: "用孙宇晨的注意力经济视角分析营销、危机公关和叙事传播。",
    trigger: "用孙宇晨视角设计一个传播策略",
    pathHint: "~/.codex/skills/nuwa-skill/examples/sun-yuchen-perspective",
  },
  {
    name: "skill-creator",
    category: "system",
    source: "system",
    readiness: "ready",
    description: "创建或更新 Codex Skill 的方法论和结构规范。",
    trigger: "用 skill-creator 帮我创建一个新 Skill",
    pathHint: "~/.codex/skills/.system/skill-creator",
  },
  {
    name: "skill-installer",
    category: "system",
    source: "system",
    readiness: "ready",
    description: "从 curated 列表或 GitHub 仓库安装 Codex Skill。",
    trigger: "用 skill-installer 安装这个 GitHub Skill",
    pathHint: "~/.codex/skills/.system/skill-installer",
  },
  {
    name: "plugin-creator",
    category: "system",
    source: "system",
    readiness: "ready",
    description: "创建 Codex 插件目录、manifest 和个人插件市场条目。",
    trigger: "用 plugin-creator 新建一个 Codex 插件",
    pathHint: "~/.codex/skills/.system/plugin-creator",
  },
  {
    name: "imagegen",
    category: "system",
    source: "system",
    readiness: "ready",
    description: "生成或编辑位图视觉素材、产品图、插画、纹理、精灵图和 mockup。",
    trigger: "用 imagegen 生成一张产品场景图",
    pathHint: "~/.codex/skills/.system/imagegen",
  },
  {
    name: "openai-docs",
    category: "system",
    source: "system",
    readiness: "ready",
    description: "查询 OpenAI/Codex 官方文档、模型选择、API 迁移和提示升级指导。",
    trigger: "用 openai-docs 查一下最新 OpenAI API 用法",
    pathHint: "~/.codex/skills/.system/openai-docs",
  },
];

export function skillActivationPrompt(skill: SkillCatalogItem): string {
  return `在 Codex 里说：${skill.trigger}`;
}
