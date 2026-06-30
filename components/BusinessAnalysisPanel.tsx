"use client";

const BUSINESS_ANALYSIS_URL =
  process.env.NEXT_PUBLIC_BUSINESS_ANALYSIS_URL || "http://127.0.0.1:8501/";

export function BusinessAnalysisPanel() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-950">Amazon 库存利润经营分析</div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            上传补货、库存、广告和利润 Excel，输出 SKU 角色、父体、SPU、品线与行动队列。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-sm text-slate-500">本地 Streamlit 服务</span>
          <a
            href={BUSINESS_ANALYSIS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            新窗口打开
          </a>
        </div>
      </div>

      <iframe
        title="Amazon 库存利润经营分析工具"
        src={BUSINESS_ANALYSIS_URL}
        className="h-[900px] w-full rounded-b-2xl border-0 bg-slate-50"
        sandbox="allow-downloads allow-forms allow-same-origin allow-scripts"
      />
    </section>
  );
}
