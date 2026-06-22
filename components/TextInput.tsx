type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
};

const PLACEHOLDER = `carry on luggage
luggage sets
hard shell luggage
carry on suitcase
spinner wheels luggage`;

export function TextInput({ value, onChange, onAnalyze }: TextInputProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">关键词输入</h2>
          <p className="mt-1 text-sm text-slate-500">每行一个关键词组，支持直接粘贴</p>
        </div>
        <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
          英文词频
        </span>
      </div>

      <label className="sr-only" htmlFor="keyword-input">
        输入关键词组
      </label>
      <textarea
        id="keyword-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            onAnalyze();
          }
        }}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        className="min-h-[340px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 font-mono text-[15px] leading-7 text-slate-800 placeholder:text-slate-400 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none"
      />
      <p className="mt-3 text-xs leading-5 text-slate-400">
        自动转为小写，并清理基础英文标点。按 ⌘/Ctrl + Enter 可快速统计。
      </p>
    </section>
  );
}
