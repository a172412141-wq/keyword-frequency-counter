"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_META,
  READINESS_LABELS,
  SKILL_CATALOG,
  SKILL_CATALOG_AUDIT,
  SOURCE_LABELS,
  VALIDATION_LABELS,
  skillActivationPrompt,
  type SkillCatalogItem,
  type SkillCategory,
  type SkillReadiness,
  type SkillSource,
  type SkillValidation,
} from "@/lib/skillCatalog";

type FilterValue<T extends string> = "all" | T;

const CATEGORY_OPTIONS: Array<FilterValue<SkillCategory>> = [
  "all",
  "amazon",
  "business",
  "collaboration",
  "perspective",
  "system",
];

const READINESS_OPTIONS: Array<FilterValue<SkillReadiness>> = [
  "all",
  "ready",
  "needs_config",
  "hosted",
];

const SOURCE_OPTIONS: Array<FilterValue<SkillSource>> = [
  "all",
  "workspace",
  "personal",
  "system",
];

const VALIDATION_OPTIONS: Array<FilterValue<SkillValidation>> = [
  "all",
  "valid",
  "warning",
];

export function SkillHub() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FilterValue<SkillCategory>>("all");
  const [readiness, setReadiness] = useState<FilterValue<SkillReadiness>>("all");
  const [source, setSource] = useState<FilterValue<SkillSource>>("all");
  const [validation, setValidation] = useState<FilterValue<SkillValidation>>("all");
  const [selectedName, setSelectedName] = useState(SKILL_CATALOG[0]?.name ?? "");
  const [copied, setCopied] = useState(false);

  const filteredSkills = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return SKILL_CATALOG.filter((skill) => {
      const queryMatch =
        !normalized ||
        [
          skill.name,
          skill.description,
          skill.trigger,
          skill.requirement ?? "",
          CATEGORY_META[skill.category].label,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalized);
      return (
        queryMatch &&
        (category === "all" || skill.category === category) &&
        (readiness === "all" || skill.readiness === readiness) &&
        (source === "all" || skill.source === source) &&
        (validation === "all" || skill.validation === validation)
      );
    });
  }, [category, query, readiness, source, validation]);

  const selectedSkill =
    filteredSkills.find((skill) => skill.name === selectedName) ??
    SKILL_CATALOG.find((skill) => skill.name === selectedName) ??
    filteredSkills[0] ??
    SKILL_CATALOG[0];

  const categoryCounts = useMemo(() => {
    return SKILL_CATALOG.reduce(
      (counts, skill) => ({
        ...counts,
        [skill.category]: (counts[skill.category] ?? 0) + 1,
      }),
      {} as Record<SkillCategory, number>,
    );
  }, []);

  async function copyPrompt(skill: SkillCatalogItem) {
    try {
      await navigator.clipboard.writeText(skillActivationPrompt(skill));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
            默认自动发布已开启
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-teal-950">
            已检查 {SKILL_CATALOG_AUDIT.summary.filesScanned} 份 Skill 文件，去重后自动发布 {SKILL_CATALOG_AUDIT.summary.publishedSkills} 个；
            发现 {SKILL_CATALOG_AUDIT.summary.duplicateFiles} 份重复副本并自动合并。以后新增 Skill 会在同步发布时自动进入目录。
          </p>
          <p className="mt-1 text-xs leading-5 text-teal-700">
            公网页面只展示名称、简介、来源、依赖和调用口令，不上传 Skill 正文、脚本、凭证或本地数据。
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-teal-200 bg-white/80 px-4 py-3 text-center">
          <div className="text-xs font-semibold text-teal-700">目录快照</div>
          <div className="mt-1 text-sm font-bold text-teal-950">
            {SKILL_CATALOG_AUDIT.generatedAt?.slice(0, 10) ?? "待同步"}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_150px_150px]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                搜索 Skill
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入名称、场景、触发词"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                状态
              </span>
              <select
                value={readiness}
                onChange={(event) => setReadiness(event.target.value as FilterValue<SkillReadiness>)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
              >
                {READINESS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "全部状态" : READINESS_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                来源
              </span>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value as FilterValue<SkillSource>)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "全部来源" : SOURCE_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                结构
              </span>
              <select
                value={validation}
                onChange={(event) => setValidation(event.target.value as FilterValue<SkillValidation>)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
              >
                {VALIDATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "全部结构" : VALIDATION_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="Skill 分类筛选">
            {CATEGORY_OPTIONS.map((option) => {
              const active = category === option;
              const label = option === "all" ? "全部" : CATEGORY_META[option].label;
              const count = option === "all" ? SKILL_CATALOG.length : categoryCounts[option] ?? 0;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(option)}
                  className={`min-h-9 rounded-lg px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
                  }`}
                >
                  {label} · {count}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <Metric label="平台总数" value={SKILL_CATALOG.length} />
          <Metric
            label="自动发布"
            value={SKILL_CATALOG_AUDIT.summary.publishedSkills}
          />
          <Metric
            label="待复核"
            value={SKILL_CATALOG_AUDIT.summary.warningSkills}
          />
        </div>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-3 md:grid-cols-2">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              active={selectedSkill?.name === skill.name}
              onSelect={() => setSelectedName(skill.name)}
            />
          ))}
          {filteredSkills.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2">
              没有匹配的 Skill。
            </div>
          ) : null}
        </div>

        <aside className="sticky top-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedSkill ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge>{CATEGORY_META[selectedSkill.category].label}</Badge>
                <Badge>{READINESS_LABELS[selectedSkill.readiness]}</Badge>
                <Badge>{SOURCE_LABELS[selectedSkill.source]}</Badge>
                <ValidationBadge validation={selectedSkill.validation} />
              </div>
              <h2 className="mt-4 break-words text-lg font-bold text-slate-950">{selectedSkill.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{selectedSkill.description}</p>
              <div className="mt-4 rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                {skillActivationPrompt(selectedSkill)}
              </div>
              <button
                type="button"
                onClick={() => copyPrompt(selectedSkill)}
                className="mt-3 min-h-10 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                {copied ? "已复制" : "复制触发语"}
              </button>
              <dl className="mt-5 space-y-3 text-sm">
                <InfoRow label="依赖" value={selectedSkill.requirement ?? "无额外依赖"} />
                <InfoRow
                  label="结构校验"
                  value={selectedSkill.validationNote ?? VALIDATION_LABELS[selectedSkill.validation]}
                />
                <InfoRow label="位置" value={selectedSkill.pathHint} />
              </dl>
            </>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-4 text-center">
      <div className="text-2xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
      {children}
    </span>
  );
}

function ValidationBadge({ validation }: { validation: SkillValidation }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        validation === "valid"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-amber-50 text-amber-700 ring-amber-200"
      }`}
    >
      {VALIDATION_LABELS[validation]}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-slate-700">{value}</dd>
    </div>
  );
}

function SkillCard({
  skill,
  active,
  onSelect,
}: {
  skill: SkillCatalogItem;
  active: boolean;
  onSelect: () => void;
}) {
  const category = CATEGORY_META[skill.category];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-[190px] rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${category.accent}`}>
          {category.label}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {READINESS_LABELS[skill.readiness]}
        </span>
        <ValidationBadge validation={skill.validation} />
      </div>
      <h3 className="mt-4 break-words text-base font-bold text-slate-950">{skill.name}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{skill.description}</p>
      <div className="mt-4 text-xs font-semibold text-slate-400">{SOURCE_LABELS[skill.source]}</div>
    </button>
  );
}
