import generatedCatalog from "../data/skill-catalog.generated.json";

export type SkillCategory =
  | "amazon"
  | "business"
  | "collaboration"
  | "perspective"
  | "system";

export type SkillSource = "workspace" | "personal" | "system";

export type SkillReadiness = "ready" | "needs_config" | "hosted";

export type SkillValidation = "valid" | "warning";

export type SkillCatalogItem = {
  name: string;
  category: SkillCategory;
  source: SkillSource;
  readiness: SkillReadiness;
  validation: SkillValidation;
  description: string;
  trigger: string;
  requirement?: string;
  pathHint: string;
  validationNote?: string;
};

export type SkillCatalogAudit = {
  generatedAt: string | null;
  summary: {
    filesScanned: number;
    uniqueSkills: number;
    publishedSkills: number;
    duplicateFiles: number;
    excludedSkills: number;
    validSkills: number;
    warningSkills: number;
  };
};

export const CATEGORY_META: Record<SkillCategory, { label: string; accent: string }> = {
  amazon: { label: "亚马逊运营", accent: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  business: { label: "经营与数据", accent: "bg-sky-50 text-sky-700 ring-sky-100" },
  collaboration: { label: "飞书协作", accent: "bg-cyan-50 text-cyan-700 ring-cyan-100" },
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
  needs_config: "需授权或配置",
  hosted: "有网页工具",
};

export const VALIDATION_LABELS: Record<SkillValidation, string> = {
  valid: "结构通过",
  warning: "结构待复核",
};

const PLATFORM_SKILLS: SkillCatalogItem[] = [
  {
    name: "amazon-title-optimizer",
    category: "amazon",
    source: "workspace",
    readiness: "hosted",
    validation: "valid",
    description:
      "Amazon Listing 文案合规检查与优化工具：识别标题长度、促销词、符号噪音、堆词、结构和夸张承诺风险，并给出五点和 A+ 版式建议。",
    trigger: "请使用 $amazon-title-optimizer 批量优化这些 Amazon Listing 文案",
    requirement: "本地 FastAPI 服务；Excel 需要 Title 列，其他 Listing 字段可选。",
    pathHint: "amazon-title-optimizer",
  },
];

const CATEGORY_ORDER: SkillCategory[] = [
  "amazon",
  "business",
  "collaboration",
  "perspective",
  "system",
];

const generatedSkills = generatedCatalog.skills as SkillCatalogItem[];

export const SKILL_CATALOG = [...PLATFORM_SKILLS, ...generatedSkills].sort((left, right) => {
  const categoryDifference =
    CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category);
  return categoryDifference || left.name.localeCompare(right.name, "en");
});

export const SKILL_CATALOG_AUDIT: SkillCatalogAudit = {
  generatedAt: generatedCatalog.generatedAt,
  summary: generatedCatalog.summary,
};

export function skillActivationPrompt(skill: SkillCatalogItem): string {
  return `在 Codex 里说：${skill.trigger}`;
}
