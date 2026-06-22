import { CATEGORY_LABELS } from "@/lib/keywordConfig";
import { ROOT_CATEGORIES, type RootCandidate } from "@/lib/keywordTypes";
import { SparkIcon } from "./icons";

type Props = {
  roots: RootCandidate[];
  onUpdate: (id: string, patch: Partial<RootCandidate>) => void;
};

export function RootCandidateTable({ roots, onUpdate }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">词根识别与分类</h2>
          <p className="mt-1 text-sm text-slate-500">分类、启用状态和分组 ID 都可以直接修改</p>
        </div>
        {roots.length > 0 && (
          <span className="w-fit rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
            已识别 {roots.length} 个词根
          </span>
        )}
      </div>

      {roots.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center px-6 py-10 text-center">
          <span className="mb-3 grid size-11 place-items-center rounded-2xl bg-teal-50 text-teal-600">
            <SparkIcon width={21} height={21} />
          </span>
          <p className="font-medium text-slate-700">等待关键词输入</p>
          <p className="mt-1.5 text-sm text-slate-500">输入或加载示例后，系统会自动识别 1–4 gram 词根。</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                <th className="px-4 py-3.5 text-center">启用</th>
                <th className="px-4 py-3.5">原始词根 / 归一词根</th>
                <th className="px-4 py-3.5">分类</th>
                <th className="px-4 py-3.5">同义词组 ID</th>
                <th className="px-4 py-3.5">冲突组 ID</th>
                <th className="px-4 py-3.5 text-right">频次</th>
                <th className="px-4 py-3.5 text-right">置信度</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roots.map((root) => (
                <tr key={root.id} className={!root.enabled ? "bg-slate-50/70 opacity-60" : "hover:bg-slate-50/60"}>
                  <td className="px-4 py-3 text-center">
                    <input
                      aria-label={`启用 ${root.root}`}
                      type="checkbox"
                      checked={root.enabled}
                      onChange={(event) => onUpdate(root.id, { enabled: event.target.checked })}
                      className="size-4 accent-teal-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-mono text-sm font-semibold text-slate-900">{root.root}</span>
                    {root.canonicalRoot !== root.root && (
                      <span className="mt-1 block font-mono text-xs text-teal-700">→ {root.canonicalRoot}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`${root.root} 分类`}
                      value={root.category}
                      onChange={(event) =>
                        onUpdate(root.id, { category: event.target.value as RootCandidate["category"] })
                      }
                      className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-teal-500 focus:outline-none"
                    >
                      {ROOT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <EditableGroup
                      label={`${root.root} 同义词组`}
                      value={root.synonymGroupId}
                      placeholder="留空表示无"
                      onChange={(synonymGroupId) => onUpdate(root.id, { synonymGroupId })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <EditableGroup
                      label={`${root.root} 冲突组`}
                      value={root.conflictGroupId}
                      placeholder="输入相同 ID 即互斥"
                      onChange={(conflictGroupId) => onUpdate(root.id, { conflictGroupId })}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-slate-700">
                    {root.sourceCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      root.confidence >= 0.9
                        ? "bg-emerald-50 text-emerald-700"
                        : root.confidence >= 0.6
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}>
                      {Math.round(root.confidence * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EditableGroup({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value.trim().toLowerCase().replace(/\s+/g, "_"))}
      className="min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-700 placeholder:font-sans placeholder:text-slate-300 focus:border-teal-500 focus:outline-none"
    />
  );
}
