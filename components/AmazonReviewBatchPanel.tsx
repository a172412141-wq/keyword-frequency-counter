"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  MAX_REVIEW_BATCH_SIZE,
  parseAsinBatch,
  type ReviewMode,
} from "@/lib/reviewBatch";

type JobStatus = "queued" | "running" | "success" | "error" | "cancelled";

type ReviewJob = {
  asin: string;
  status: JobStatus;
  reviewCount?: number;
  warningCount?: number;
  starCounts?: string;
  fileName?: string;
  downloadUrl?: string;
  error?: string;
};

const MODE_OPTIONS: Array<{
  value: ReviewMode;
  label: string;
  note: string;
}> = [
  {
    value: "basic",
    label: "快速",
    note: "单窗口，通常不超过 100 条；适合预览。",
  },
  {
    value: "full",
    label: "标准",
    note: "按 1–5 星分层，最多约 500 条；批量任务推荐。",
  },
  {
    value: "max",
    label: "最大化",
    note: "星级 × 排序窗口，覆盖更高但耗时明显增加。",
  },
];

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: "等待中",
  running: "生成中",
  success: "已完成",
  error: "失败",
  cancelled: "已停止",
};

const STATUS_STYLES: Record<JobStatus, string> = {
  queued: "border-slate-200 bg-slate-50 text-slate-600",
  running: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  cancelled: "border-amber-200 bg-amber-50 text-amber-700",
};

const REVIEW_API_BASE_URL = (
  process.env.NEXT_PUBLIC_REVIEW_API_BASE_URL || ""
).replace(/\/$/, "");

export function AmazonReviewBatchPanel() {
  const [asinText, setAsinText] = useState("");
  const [mode, setMode] = useState<ReviewMode>("full");
  const [jobs, setJobs] = useState<ReviewJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [fileName, setFileName] = useState("");
  const cancelRequested = useRef(false);
  const objectUrls = useRef(new Set<string>());

  const parsed = useMemo(() => parseAsinBatch(asinText), [asinText]);
  const completedCount = jobs.filter((job) => job.status === "success").length;
  const failedCount = jobs.filter((job) => job.status === "error").length;
  const processedCount = jobs.filter((job) =>
    ["success", "error", "cancelled"].includes(job.status),
  ).length;

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  async function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setAsinText(text);
    setFileName(file.name);
    setJobs([]);
    event.target.value = "";
  }

  async function startBatch() {
    if (parsed.asins.length === 0 || isRunning) return;
    clearObjectUrls();
    cancelRequested.current = false;
    setIsRunning(true);
    setJobs(parsed.asins.map((asin) => ({ asin, status: "queued" })));

    for (const asin of parsed.asins) {
      if (cancelRequested.current) {
        setJobs((current) =>
          current.map((job) =>
            job.status === "queued" ? { ...job, status: "cancelled" } : job,
          ),
        );
        break;
      }

      updateJob(asin, { status: "running", error: undefined });
      try {
        const response = await fetch(
          `${REVIEW_API_BASE_URL}/api/review-analysis/${encodeURIComponent(asin)}?mode=${mode}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error || `请求失败（HTTP ${response.status}）`);
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        objectUrls.current.add(downloadUrl);
        updateJob(asin, {
          status: "success",
          reviewCount: Number(response.headers.get("X-Review-Count")) || 0,
          warningCount: Number(response.headers.get("X-Warning-Count")) || 0,
          starCounts: response.headers.get("X-Star-Counts") || undefined,
          fileName: `${asin}_review-analysis_${new Date().toISOString().slice(0, 10)}.zip`,
          downloadUrl,
        });
      } catch (caughtError) {
        updateJob(asin, {
          status: "error",
          error: caughtError instanceof Error ? caughtError.message : "生成失败，请稍后重试。",
        });
      }
    }

    setIsRunning(false);
  }

  function stopAfterCurrent() {
    cancelRequested.current = true;
  }

  function updateJob(asin: string, patch: Partial<ReviewJob>) {
    setJobs((current) =>
      current.map((job) => (job.asin === asin ? { ...job, ...patch } : job)),
    );
  }

  function downloadJob(job: ReviewJob) {
    if (!job.downloadUrl || !job.fileName) return;
    const anchor = document.createElement("a");
    anchor.href = job.downloadUrl;
    anchor.download = job.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function downloadAll() {
    jobs
      .filter(
        (job): job is ReviewJob & { downloadUrl: string; fileName: string } =>
          job.status === "success" && Boolean(job.downloadUrl && job.fileName),
      )
      .forEach((job, index) => {
        window.setTimeout(() => downloadJob(job), index * 260);
      });
  }

  function resetTool() {
    if (isRunning) return;
    clearObjectUrls();
    setAsinText("");
    setJobs([]);
    setFileName("");
    setMode("full");
  }

  function clearObjectUrls() {
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
    objectUrls.current.clear();
  }

  return (
    <section className="space-y-6">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">批量导入 ASIN</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                可粘贴 Excel 单列、Amazon 链接或上传 CSV/TXT；自动去重并逐个生成含 PDF 与 Word 报告的独立 ZIP。
              </p>
            </div>
            <span className="w-fit rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
              最多 {MAX_REVIEW_BATCH_SIZE} 个 / 批
            </span>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              ASIN 清单
            </span>
            <textarea
              value={asinText}
              onChange={(event) => {
                setAsinText(event.target.value.toUpperCase());
                setFileName("");
                if (!isRunning) setJobs([]);
              }}
              disabled={isRunning}
              spellCheck={false}
              className="mt-2 min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-semibold leading-7 text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={`每行一个 ASIN，例如：\nB0727Y5L53\nB0XXXXXXXX\n\n也可以直接粘贴 Amazon 商品链接。`}
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
              导入 CSV / TXT
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={handleFileInput}
                disabled={isRunning}
                className="sr-only"
              />
            </label>
            {fileName ? (
              <span className="text-sm text-slate-500">已读取：{fileName}</span>
            ) : (
              <span className="text-sm text-slate-400">
                Excel 文件请复制 ASIN 列后直接粘贴
              </span>
            )}
          </div>

          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              采集模式
            </div>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {MODE_OPTIONS.map((option) => {
                const active = mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    disabled={isRunning}
                    onClick={() => setMode(option.value)}
                    className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "border-teal-300 bg-teal-50 ring-1 ring-teal-100"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className={`text-sm font-bold ${active ? "text-teal-800" : "text-slate-800"}`}>
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {option.note}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startBatch}
              disabled={parsed.asins.length === 0 || isRunning}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isRunning ? "正在逐个生成…" : `开始生成 ${parsed.asins.length || 0} 个分析包`}
            </button>
            {isRunning ? (
              <button
                type="button"
                onClick={stopAfterCurrent}
                className="min-h-11 rounded-lg border border-amber-200 bg-amber-50 px-5 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
              >
                当前完成后停止
              </button>
            ) : (
              <button
                type="button"
                onClick={resetTool}
                disabled={!asinText && jobs.length === 0}
                className="min-h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                清空
              </button>
            )}
          </div>

          {parsed.truncatedCount > 0 && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              超出单批上限，后 {parsed.truncatedCount} 个 ASIN 未加入本次任务。
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
              每个 ASIN 一个 ZIP
            </div>
            <h2 className="mt-3 text-xl font-bold">分析包内容</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <li>中文评论洞察报告 PDF</li>
              <li>可编辑的 Word 文档 DOCX</li>
              <li>轻量版 Markdown 报告</li>
              <li>清洗后的完整评论 CSV</li>
              <li>主题和样本指标 JSON</li>
              <li>产品机会优先级 CSV</li>
              <li>任务清单与采集警告</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="识别 ASIN" value={parsed.asins.length} />
            <MetricCard label="自动去重" value={parsed.duplicateCount} />
            <MetricCard label="已完成" value={completedCount} />
            <MetricCard label="失败" value={failedCount} tone={failedCount ? "danger" : "neutral"} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500 shadow-sm">
            <div className="font-bold text-slate-800">数据解释提醒</div>
            <p className="mt-2">
              标准和最大化模式会按星级分层采集，因此包内的样本均分与星级比例不能当作商品真实评分。
            </p>
            <p className="mt-2">
              接口失败会明确标记，不会把网络失败误报成“0 条评论”。
            </p>
          </div>
        </aside>
      </div>

      {jobs.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-950">生成队列</h2>
              <p className="mt-1 text-sm text-slate-500">
                已处理 {processedCount}/{jobs.length}，成功 {completedCount}，失败 {failedCount}
              </p>
            </div>
            <button
              type="button"
              onClick={downloadAll}
              disabled={completedCount === 0}
              className="min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              下载全部已完成包
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {jobs.map((job, index) => (
              <div
                key={job.asin}
                className="grid gap-3 px-5 py-4 md:grid-cols-[48px_150px_110px_minmax(0,1fr)_130px] md:items-center"
              >
                <span className="text-sm font-bold text-slate-400">{index + 1}</span>
                <code className="text-sm font-bold text-slate-900">{job.asin}</code>
                <span
                  className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[job.status]}`}
                >
                  {STATUS_LABELS[job.status]}
                </span>
                <div className="min-w-0 text-sm text-slate-500">
                  {job.status === "success" ? (
                    <span>
                      {job.reviewCount} 条评论
                      {job.starCounts ? ` · 星级样本 ${job.starCounts}` : ""}
                      {job.warningCount ? ` · ${job.warningCount} 个窗口警告` : ""}
                    </span>
                  ) : job.status === "error" ? (
                    <span className="text-rose-700">{job.error}</span>
                  ) : job.status === "running" ? (
                    <span>正在采集、分析并生成 PDF / Word 报告，请勿关闭页面。</span>
                  ) : (
                    <span>{job.status === "cancelled" ? "未发起请求" : "等待前一个 ASIN 完成"}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => downloadJob(job)}
                  disabled={job.status !== "success"}
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  下载 ZIP
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone === "danger" ? "text-rose-700" : "text-slate-950"}`}>
        {value}
      </div>
    </div>
  );
}
