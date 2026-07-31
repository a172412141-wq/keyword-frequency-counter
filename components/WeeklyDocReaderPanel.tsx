"use client";

import { useState, type FormEvent } from "react";
import { CopyIcon, TrashIcon } from "@/components/icons";

type SearchResult = {
  type: string;
  title: string;
  url: string;
  editTimeIso: string;
  openTimeIso: string;
  createTimeIso: string;
};

type SearchResponse = {
  ok: true;
  results: SearchResult[];
  hasMore: boolean;
  notice?: string;
};

type WeeklyReading = {
  stageGuess: string;
  meetingPoints: string[];
  kpiSignals: string[];
  redLineSignals: string[];
  actionSignals: string[];
  learningCandidates: string[];
  pendingReview: string[];
};

type FetchResponse = {
  ok: true;
  title: string;
  meetingDate: string;
  archivePath: string;
  documentId: string;
  revisionId: string;
  outline: string;
  contentPreview: string;
  reading: WeeklyReading;
  diagnosis: {
    stage: string;
    stageEvidence: string[];
    confidence: string;
    mainConflict: string;
    kpiMismatch: string[];
    relationshipFindings: string[];
    redLineChecks: Array<{
      level: "正常" | "关注" | "红线" | "待确认";
      category: string;
      finding: string;
      evidence: string[];
    }>;
    immediateActions: string[];
    weeklyChecks: string[];
    forbiddenActions: string[];
    upgradeOrStopConditions: string[];
    missingData: string[];
  };
  notice?: string;
};

const DEFAULT_SEARCH_QUERY = "周会";

export function WeeklyDocReaderPanel() {
  const [doc, setDoc] = useState("");
  const [topic, setTopic] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState(DEFAULT_SEARCH_QUERY);
  const [editedSince, setEditedSince] = useState("30d");
  const [isSearching, setIsSearching] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [result, setResult] = useState<FetchResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function searchDocs(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsSearching(true);
    setError("");

    try {
      const data = await postWeeklyDoc<SearchResponse>({
        action: "search",
        searchQuery,
        editedSince,
      });
      setSearchResults(data.results);
    } catch (caughtError) {
      setSearchResults([]);
      setError(caughtError instanceof Error ? caughtError.message : "搜索飞书文档失败。");
    } finally {
      setIsSearching(false);
    }
  }

  async function readDoc(event?: FormEvent<HTMLFormElement>, docOverride?: string, topicOverride?: string) {
    event?.preventDefault();
    const targetDoc = (docOverride ?? doc).trim();
    if (!targetDoc) {
      setError("请输入飞书文档 URL 或先从搜索结果选择一个文档。");
      return;
    }

    setIsReading(true);
    setError("");
    setCopied(false);

    try {
      const data = await postWeeklyDoc<FetchResponse>({
        action: "fetch",
        doc: targetDoc,
        topic: topicOverride ?? topic,
        meetingDate,
        keyword,
      });
      setDoc(targetDoc);
      setResult(data);
    } catch (caughtError) {
      setResult(null);
      setError(caughtError instanceof Error ? caughtError.message : "读取飞书周会文档失败。");
    } finally {
      setIsReading(false);
    }
  }

  async function copySummary() {
    if (!result) return;
    const text = [
      `# ${result.meetingDate} ${result.title}`,
      `归档: ${result.archivePath}`,
      `阶段判断: ${result.reading.stageGuess}`,
      `诊断置信度: ${result.diagnosis.confidence}`,
      `主矛盾: ${result.diagnosis.mainConflict}`,
      "",
      "## 本次会议要点",
      ...result.reading.meetingPoints.map((item) => `- ${item}`),
      "",
      "## 可沉淀规则",
      ...result.reading.learningCandidates.map((item) => `- ${item}`),
      "",
      "## 立即动作",
      ...result.diagnosis.immediateActions.map((item) => `- ${item}`),
      "",
      "## 红线检查",
      ...result.diagnosis.redLineChecks.map((item) => `- [${item.level}] ${item.category}: ${item.finding}`),
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function clearAll() {
    setDoc("");
    setTopic("");
    setMeetingDate("");
    setKeyword("");
    setError("");
    setResult(null);
    setCopied(false);
  }

  const busy = isReading || isSearching;

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <form onSubmit={readDoc} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <PanelHeader title="粘贴链接，立即诊断" eyebrow="FEISHU DOC → FANG DIAGNOSIS" />
          <div className="space-y-4 p-4 sm:p-5">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                飞书文档 URL / Token
              </span>
              <textarea
                value={doc}
                onChange={(event) => setDoc(event.target.value)}
                placeholder="https://xxx.feishu.cn/docx/..."
                className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="block md:col-span-1">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  会议日期
                </span>
                <input
                  value={meetingDate}
                  onChange={(event) => setMeetingDate(event.target.value)}
                  placeholder="2026-07-01"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  主题
                </span>
                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Fang 周会"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                关键词精读
              </span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="库存|补货|退货|现金流"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
              />
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={isReading}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isReading ? "正在读取并诊断..." : "开始快速诊断"}
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={busy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <TrashIcon />
                清空
              </button>
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                {error}
              </div>
            ) : null}
          </div>
        </form>

        <form onSubmit={searchDocs} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <PanelHeader title="搜索周会" eyebrow="DRIVE SEARCH" />
          <div className="space-y-4 p-4 sm:p-5">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                搜索词
              </span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                最近编辑
              </span>
              <select
                value={editedSince}
                onChange={(event) => setEditedSince(event.target.value)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800"
              >
                <option value="7d">7 天</option>
                <option value="30d">30 天</option>
                <option value="3m">3 个月</option>
                <option value="6m">6 个月</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSearching ? "搜索中..." : "搜索飞书文档"}
            </button>

            <div className="space-y-2">
              {searchResults.map((item) => (
                <button
                  key={`${item.url}-${item.title}`}
                  type="button"
                  onClick={() => void readDoc(undefined, item.url, item.title)}
                  disabled={isReading || !item.url}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{item.title || "未命名文档"}</span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                      {item.type || "doc"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{item.editTimeIso || item.openTimeIso || item.createTimeIso}</div>
                </button>
              ))}
              {searchResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                  暂无搜索结果
                </div>
              ) : null}
            </div>
          </div>
        </form>
      </div>

      {result ? (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{result.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{result.meetingDate} · {result.archivePath}</p>
              </div>
              <button
                type="button"
                onClick={() => void copySummary()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <CopyIcon />
                {copied ? "已复制" : "复制摘要"}
              </button>
            </div>

            <div className="grid gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-4">
              <SignalMetric label="经营阶段" value={result.diagnosis.stage} />
              <SignalMetric label="判断置信度" value={result.diagnosis.confidence} />
              <SignalMetric label="已触发红线" value={String(result.diagnosis.redLineChecks.filter((item) => item.level === "红线").length)} />
              <SignalMetric label="缺失指标" value={String(result.diagnosis.missingData.length)} />
            </div>

            <div className="space-y-5 p-5 lg:p-6">
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">本阶段主矛盾</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{result.diagnosis.mainConflict}</p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <SignalList title="立即动作" items={result.diagnosis.immediateActions} />
                <SignalList title="KPI 是否错位" items={result.diagnosis.kpiMismatch} />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">六类经营红线</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {result.diagnosis.redLineChecks.map((item) => (
                    <RedLineCard key={item.category} item={item} />
                  ))}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <SignalList title="关系诊断" items={result.diagnosis.relationshipFindings} />
                <SignalList title="本周必看 KPI" items={result.diagnosis.weeklyChecks} />
                <SignalList title="本阶段禁做事项" items={result.diagnosis.forbiddenActions} />
                <SignalList title="升级 / 止损条件" items={result.diagnosis.upgradeOrStopConditions} />
                <SignalList title="缺失数据（结论暂不强推）" items={result.diagnosis.missingData} />
                <SignalList title="本次会议事实要点" items={result.reading.meetingPoints} />
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <PreviewBlock title="Outline" content={result.outline} />
            <PreviewBlock title="Content Preview" content={result.contentPreview} />
          </section>
        </div>
      ) : null}
    </section>
  );
}

function RedLineCard({ item }: { item: FetchResponse["diagnosis"]["redLineChecks"][number] }) {
  const styles = item.level === "红线"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : item.level === "正常"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <article className={`rounded-xl border p-4 ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold">{item.category}</h4>
        <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-semibold">{item.level}</span>
      </div>
      <p className="mt-2 text-sm leading-6">{item.finding}</p>
      {item.evidence.length ? <p className="mt-2 text-xs leading-5 opacity-80">证据：{item.evidence[0]}</p> : null}
    </article>
  );
}

function PanelHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
      <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</div>
      <h2 className="mt-1 text-base font-semibold text-slate-900">{title}</h2>
    </div>
  );
}

function SignalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 px-4 py-4 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SignalList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          {items.map((item) => (
            <li key={item} className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">未识别到明确内容</p>
      )}
    </div>
  );
}

function PreviewBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        {content}
      </pre>
    </div>
  );
}

async function postWeeklyDoc<T>(payload: Record<string, string>) {
  const response = await fetch("/api/weekly-doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as T;
}

async function readApiError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string; detail?: string };
    return data.error || data.detail || response.statusText;
  } catch {
    return response.statusText;
  }
}
