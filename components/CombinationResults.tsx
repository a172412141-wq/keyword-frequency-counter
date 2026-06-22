import { CATEGORY_LABELS } from "@/lib/keywordConfig";
import type { CombinationGenerationResult } from "@/lib/keywordTypes";
import { CopyIcon, DownloadIcon, SparkIcon } from "./icons";

type Props = {
  result: CombinationGenerationResult;
  hasRoots: boolean;
  hasCoreProduct: boolean;
  onCopy: () => void;
  onExport: () => void;
};

export function CombinationResults({
  result,
  hasRoots,
  hasCoreProduct,
  onCopy,
  onExport,
}: Props) {
  const stats = [
    ["识别词根", result.stats.identifiedRoots],
    ["启用词根", result.stats.enabledRoots],
    ["生成前组合", result.stats.generatedBeforeFiltering],
    ["冲突过滤", result.stats.conflictFiltered],
    ["最终输出", result.stats.finalResults],
  ] as const;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">组合结果</h2>
          <p className="mt-1 text-sm text-slate-500">短组合优先，并按场景、功能和来源频次排序</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCopy}
            disabled={result.keywords.length === 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <CopyIcon width={16} height={16} />
            复制全部
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={result.keywords.length === 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-600 px-3.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <DownloadIcon width={16} height={16} />
            导出 CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-slate-50 px-4 py-3.5 text-center">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value.toLocaleString("zh-CN")}</p>
          </div>
        ))}
      </div>

      {!hasRoots ? (
        <EmptyState title="暂无组合结果" detail="先在上方输入关键词，系统会自动完成词根识别和组合。" />
      ) : !hasCoreProduct ? (
        <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm leading-6 text-amber-900 sm:m-6">
          <strong>未识别到核心产品词根。</strong> 请在词根表格中把至少一个词根设为 core_product。
        </div>
      ) : result.keywords.length === 0 ? (
        <EmptyState title="当前规则下没有可用组合" detail="可减少最少词根数、放宽模式，或检查是否有过多冲突组。" />
      ) : (
        <div className="max-h-[720px] divide-y divide-slate-100 overflow-y-auto">
          {result.keywords.map((item, index) => (
            <div key={item.keyword} className="flex gap-3 px-5 py-3.5 hover:bg-slate-50/70 sm:px-6">
              <span className="mt-0.5 w-9 shrink-0 text-right text-xs tabular-nums text-slate-300">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words font-mono text-sm font-semibold leading-6 text-slate-900">{item.keyword}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {item.rootCount} 词根
                  </span>
                  {item.categories.map((category) => (
                    <span key={category} className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                      {CATEGORY_LABELS[category]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.stats.truncated && (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs leading-5 text-amber-800 sm:px-6">
          组合空间较大，已按当前模式的安全上限提前收敛；可减少启用词根或缩短最大词根数以获得更聚焦的结果。
        </div>
      )}
    </section>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
        <SparkIcon width={22} height={22} />
      </span>
      <p className="font-medium text-slate-700">{title}</p>
      <p className="mt-1.5 max-w-md text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}
