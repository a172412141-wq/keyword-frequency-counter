import { NGRAM_OPTIONS, type NgramSize } from "@/lib/wordFrequency";

type NgramSelectorProps = {
  selectedSizes: readonly NgramSize[];
  onToggle: (size: NgramSize) => void;
};

export function NgramSelector({ selectedSizes, onToggle }: NgramSelectorProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">输出方式</h2>
          <p className="mt-1 text-sm text-slate-500">可同时选择多种词根</p>
        </div>
        <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
          已选 {selectedSizes.length} 种
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" aria-label="选择词根输出方式">
        {NGRAM_OPTIONS.map((option) => {
          const selected = selectedSizes.includes(option.size);

          return (
            <button
              key={option.size}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(option.size)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                selected
                  ? "border-teal-500 bg-teal-50 text-teal-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-0.5 block font-mono text-xs text-slate-400">{option.example}</span>
              </span>
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded-md border text-xs font-bold ${
                  selected ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 text-transparent"
                }`}
              >
                ✓
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">组合词根按每行相邻单词生成，不跨行拼接；选择多种时会分组输出并分别计算占比。</p>
    </section>
  );
}
