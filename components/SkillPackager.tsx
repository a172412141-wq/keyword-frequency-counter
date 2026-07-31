"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyIcon, DownloadIcon, SparkIcon } from "@/components/icons";
import {
  TOOL_SKILL_CATEGORY_LABELS,
  TOOL_SKILL_DEPLOY_LABELS,
  type ToolSkillCategory,
  type ToolSkillDeployKind,
} from "@/lib/toolSkillPackages";

type FilterValue<T extends string> = "all" | T;

type ToolSkillPackageSummary = {
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
  sourceStatus: Array<{ path: string; exists: boolean }>;
  missingSourcePaths: string[];
};

type PackageListResponse = {
  packages: ToolSkillPackageSummary[];
};

const CATEGORY_OPTIONS: Array<FilterValue<ToolSkillCategory>> = [
  "all",
  "amazon",
  "business",
  "keyword",
  "system",
];

const DEPLOY_OPTIONS: Array<FilterValue<ToolSkillDeployKind>> = [
  "all",
  "next-fastapi",
  "streamlit",
  "next-panel",
  "skill-only",
];

export function SkillPackager() {
  const [packages, setPackages] = useState<ToolSkillPackageSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FilterValue<ToolSkillCategory>>("all");
  const [deployKind, setDeployKind] = useState<FilterValue<ToolSkillDeployKind>>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPackages() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/skill-packages", { cache: "no-store" });
        const data = (await response.json()) as PackageListResponse & { error?: string };
        if (!response.ok) throw new Error(data.error || "读取封装清单失败。");
        if (!active) return;
        setPackages(data.packages);
        setSelectedId((current) => current || data.packages[0]?.id || "");
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "读取封装清单失败。");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPackages();
    return () => {
      active = false;
    };
  }, []);

  const filteredPackages = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return packages.filter((item) => {
      const matchesQuery =
        !normalized ||
        [
          item.title,
          item.skillName,
          item.description,
          item.trigger,
          item.deployLabel,
          TOOL_SKILL_CATEGORY_LABELS[item.category],
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalized);

      return (
        matchesQuery &&
        (category === "all" || item.category === category) &&
        (deployKind === "all" || item.deployKind === deployKind)
      );
    });
  }, [category, deployKind, packages, query]);

  const selectedPackage =
    filteredPackages.find((item) => item.id === selectedId) ??
    packages.find((item) => item.id === selectedId) ??
    filteredPackages[0] ??
    packages[0];

  const readyCount = packages.filter((item) => item.missingSourcePaths.length === 0).length;
  const sourceCount = packages.reduce((sum, item) => sum + item.sourcePaths.length, 0);
  const categoryCounts = useMemo(() => {
    return packages.reduce(
      (counts, item) => ({
        ...counts,
        [item.category]: (counts[item.category] ?? 0) + 1,
      }),
      {} as Record<ToolSkillCategory, number>,
    );
  }, [packages]);

  async function copyTrigger(item: ToolSkillPackageSummary) {
    try {
      await navigator.clipboard.writeText(item.trigger);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function downloadPackage(packageId: string, fileName: string) {
    setDownloadingId(packageId);
    setError("");
    try {
      const response = await fetch(`/api/skill-packages/${encodeURIComponent(packageId)}`);
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "生成一键安装包失败。");
      }

      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "生成一键安装包失败。");
    } finally {
      setDownloadingId("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-5 rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-teal-700">
            <span className="inline-flex items-center gap-2">
              <SparkIcon />
              团队一键安装
            </span>
            <span className="rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-inset ring-teal-200">
              Windows 10/11
            </span>
            <span className="rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-inset ring-teal-200">
              macOS
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Windows 和 Mac 都能双击安装
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            同一个 ZIP 同时包含 Windows 和 macOS 安装入口，解压后按电脑系统双击对应文件即可。
          </p>
        </div>
        <button
          type="button"
          disabled={loading || downloadingId !== "" || readyCount !== packages.length}
          onClick={() => void downloadPackage("all", "1sme-skills-one-click.zip")}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <DownloadIcon />
          {downloadingId === "all" ? "正在准备安装包..." : "下载全平台一键安装包"}
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                搜索工具包
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入工具、Skill 名或部署方式"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                分类
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as FilterValue<ToolSkillCategory>)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "全部分类" : TOOL_SKILL_CATEGORY_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                部署
              </span>
              <select
                value={deployKind}
                onChange={(event) => setDeployKind(event.target.value as FilterValue<ToolSkillDeployKind>)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
              >
                {DEPLOY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "全部部署形态" : TOOL_SKILL_DEPLOY_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {CATEGORY_OPTIONS.map((option) => {
              const active = category === option;
              const label = option === "all" ? "全部" : TOOL_SKILL_CATEGORY_LABELS[option];
              const count = option === "all" ? packages.length : categoryCounts[option] ?? 0;
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
          <Metric label="工具包" value={packages.length} />
          <Metric label="可下载" value={readyCount} />
          <Metric label="源码项" value={sourceCount} />
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="grid gap-3 lg:grid-cols-2">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 lg:col-span-2">
              正在读取封装清单...
            </div>
          ) : null}

          {!loading && filteredPackages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 lg:col-span-2">
              没有匹配的工具包。
            </div>
          ) : null}

          {filteredPackages.map((item) => (
            <PackageCard
              key={item.id}
              item={item}
              active={selectedPackage?.id === item.id}
              onSelect={() => setSelectedId(item.id)}
            />
          ))}
        </div>

        <aside className="sticky top-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedPackage ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge>{TOOL_SKILL_CATEGORY_LABELS[selectedPackage.category]}</Badge>
                <Badge>{selectedPackage.deployLabel}</Badge>
                <Badge>
                  {selectedPackage.missingSourcePaths.length === 0 ? "源码齐全" : "源码缺失"}
                </Badge>
              </div>

              <h2 className="mt-4 break-words text-lg font-bold text-slate-950">
                {selectedPackage.title}
              </h2>
              <p className="mt-1 break-words text-sm font-semibold text-teal-700">
                ${selectedPackage.skillName}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{selectedPackage.description}</p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={
                    selectedPackage.missingSourcePaths.length > 0 || downloadingId !== ""
                  }
                  onClick={() =>
                    void downloadPackage(
                      selectedPackage.id,
                      `${selectedPackage.skillName}-one-click.zip`,
                    )
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <DownloadIcon />
                  {downloadingId === selectedPackage.id ? "正在打包..." : "下载一键安装包"}
                </button>
                <button
                  type="button"
                  onClick={() => copyTrigger(selectedPackage)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  <CopyIcon />
                  {copied ? "已复制" : "复制触发语"}
                </button>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <InfoRow label="安装位置" value="自动识别本机 Codex Skills 目录" />
                <InfoRow label="触发语" value={selectedPackage.trigger} />
                <InfoRow label="本地地址" value={selectedPackage.localUrl ?? "无需 Web 服务"} />
              </dl>

              <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                  安装只要三步
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-700">
                  <InstallStep number="1" label="下载" />
                  <InstallStep number="2" label="解压" />
                  <InstallStep number="3" label="按系统双击" />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <DetailList title="下载包包含" items={selectedPackage.packageHighlights} />
                <DetailList title="输入" items={selectedPackage.inputs} />
                <DetailList title="输出" items={selectedPackage.outputs} />
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  源码路径
                </h3>
                <div className="mt-3 space-y-2">
                  {selectedPackage.sourceStatus.map((item) => (
                    <div key={item.path} className="flex items-start gap-2 text-xs leading-5">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          item.exists ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <span className="break-all text-slate-600">{item.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">选择一个工具包查看详情。</div>
          )}
        </aside>
      </section>
    </div>
  );
}

function PackageCard({
  item,
  active,
  onSelect,
}: {
  item: ToolSkillPackageSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-[220px] rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-100">
          {TOOL_SKILL_CATEGORY_LABELS[item.category]}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {item.deployLabel}
        </span>
      </div>
      <h3 className="mt-4 break-words text-base font-bold text-slate-950">{item.title}</h3>
      <p className="mt-1 break-words text-xs font-semibold text-teal-700">${item.skillName}</p>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
        <span className="inline-flex items-center gap-1">
          <SparkIcon />
          {item.sourcePaths.length} 项源码
        </span>
        <span>{item.missingSourcePaths.length === 0 ? "Windows / macOS" : "有缺失路径"}</span>
      </div>
    </button>
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

function InstallStep({ number, label }: { number: string; label: string }) {
  return (
    <div className="rounded-lg bg-white px-2 py-3 ring-1 ring-inset ring-teal-100">
      <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white">
        {number}
      </div>
      <div className="mt-2">{label}</div>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-slate-700">{value}</dd>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
