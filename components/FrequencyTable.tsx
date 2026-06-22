import type { WordFrequencyGroup, WordFrequencySummary } from "@/lib/wordFrequency";
import { SparkIcon } from "./icons";

type FrequencyTableProps = {
  summary: WordFrequencySummary;
  hasAnalyzed: boolean;
  inputHasContent: boolean;
};

function ResultGroup({ group }: { group: WordFrequencyGroup }) {
  return (
    <div className="border-t border-slate-200 first:border-t-0">
      <div className="flex items-center justify-between gap-4 bg-teal-50/60 px-5 py-3 sm:px-6">
        <h3 className="text-sm font-semibold text-teal-900">{group.label}</h3>
        <span className="text-xs text-teal-700">
          {group.totalItems.toLocaleString("zh-CN")} 项 · {group.uniqueItems.toLocaleString("zh-CN")} 个唯一词根
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3.5 sm:px-6">词根</th>
              <th className="px-5 py-3.5 text-right sm:px-6">出现次数</th>
              <th className="px-5 py-3.5 text-right sm:px-6">占比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {group.rows.map((item) => (
              <tr key={item.word} className="text-sm text-slate-700 hover:bg-slate-50/70">
                <td className="px-5 py-3.5 font-mono font-medium text-slate-900 sm:px-6">{item.word}</td>
                <td className="px-5 py-3.5 text-right tabular-nums sm:px-6">
                  {item.count.toLocaleString("zh-CN")}
                </td>
                <td className="px-5 py-3.5 text-right font-medium tabular-nums text-teal-700 sm:px-6">
                  {(item.percentage * 100).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50/80 text-sm font-semibold text-slate-700">
              <td className="px-5 py-4 sm:px-6">合计</td>
              <td className="px-5 py-4 text-right tabular-nums sm:px-6">
                {group.totalItems.toLocaleString("zh-CN")} 项
              </td>
              <td className="px-5 py-4 text-right tabular-nums sm:px-6">
                {group.uniqueItems.toLocaleString("zh-CN")} 个词根
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function FrequencyTable({ summary, hasAnalyzed, inputHasContent }: FrequencyTableProps) {
  const hasResults = summary.groups.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">统计结果</h2>
          <p className="mt-1 text-sm text-slate-500">各类型独立计算占比，并按次数降序排列</p>
        </div>
        {hasResults && (
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            共 {summary.uniqueWords.toLocaleString("zh-CN")} 个统计项
          </span>
        )}
      </div>

      {hasResults ? (
        <div>
          {summary.groups.map((group) => (
            <ResultGroup key={group.size} group={group} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center">
          <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-600">
            <SparkIcon width={22} height={22} />
          </span>
          <p className="font-medium text-slate-700">
            {hasAnalyzed && inputHasContent ? "未识别到有效词根" : "暂无统计结果"}
          </p>
          <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">
            {hasAnalyzed && inputHasContent
              ? "当前选择的组合长度可能超过每行单词数，请调整输出方式或输入内容。"
              : "请先输入关键词组，选择输出方式，然后点击“统计”。"}
          </p>
        </div>
      )}
    </section>
  );
}
