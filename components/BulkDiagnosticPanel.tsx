"use client";

import { useState } from "react";

const LOCAL_BULK_URL = process.env.NEXT_PUBLIC_BULK_LOCAL_URL || "http://127.0.0.1:8000/";
const HOSTED_BULK_URL =
  process.env.NEXT_PUBLIC_BULK_HOSTED_URL || "https://bulk-ad-diagnostic-generator.onrender.com/";

type BulkEndpoint = "local" | "hosted";

const ENDPOINTS: Record<BulkEndpoint, { label: string; url: string; note: string }> = {
  local: {
    label: "本地服务",
    url: LOCAL_BULK_URL,
    note: "文件留在本机服务进程内处理",
  },
  hosted: {
    label: "托管备用",
    url: HOSTED_BULK_URL,
    note: "使用 Render 线上服务",
  },
};

export function BulkDiagnosticPanel() {
  const [endpoint, setEndpoint] = useState<BulkEndpoint>("local");
  const active = ENDPOINTS[endpoint];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="Bulk 服务切换">
          {(Object.keys(ENDPOINTS) as BulkEndpoint[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={endpoint === key}
              onClick={() => setEndpoint(key)}
              className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition ${
                endpoint === key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
              }`}
            >
              {ENDPOINTS[key].label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-sm text-slate-500">{active.note}</span>
          <a
            href={active.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            新窗口打开
          </a>
        </div>
      </div>

      <iframe
        key={active.url}
        title="Amazon 广告诊断表生成器"
        src={active.url}
        className="h-[860px] w-full rounded-b-2xl border-0 bg-slate-50"
        sandbox="allow-downloads allow-forms allow-same-origin allow-scripts"
      />
    </section>
  );
}
