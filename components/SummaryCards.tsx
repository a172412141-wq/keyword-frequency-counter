type SummaryCardsProps = {
  lineCount: number;
  totalWords: number;
  uniqueWords: number;
};

const items = [
  { key: "lines", label: "输入行数" },
  { key: "total", label: "总单词数" },
  { key: "unique", label: "唯一统计项" },
] as const;

export function SummaryCards({ lineCount, totalWords, uniqueWords }: SummaryCardsProps) {
  const values = { lines: lineCount, total: totalWords, unique: uniqueWords };

  return (
    <section aria-label="实时统计摘要" className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {items.map((item) => (
        <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
          <p className="text-xs text-slate-500 sm:text-sm">{item.label}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
            {values[item.key].toLocaleString("zh-CN")}
          </p>
        </div>
      ))}
    </section>
  );
}
