import type { ComponentType, SVGProps } from "react";
import { ChartIcon, CopyIcon, DownloadIcon, TrashIcon } from "./icons";

type ActionButtonsProps = {
  hasResults: boolean;
  hasInput: boolean;
  onAnalyze: () => void;
  onClear: () => void;
  onCopy: () => void;
  onExport: () => void;
};

type ButtonDefinition = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  action: "analyze" | "clear" | "copy" | "export";
};

const buttons: ButtonDefinition[] = [
  { label: "统计", icon: ChartIcon, action: "analyze" },
  { label: "清空", icon: TrashIcon, action: "clear" },
  { label: "复制结果", icon: CopyIcon, action: "copy" },
  { label: "导出 CSV", icon: DownloadIcon, action: "export" },
];

export function ActionButtons({
  hasResults,
  hasInput,
  onAnalyze,
  onClear,
  onCopy,
  onExport,
}: ActionButtonsProps) {
  const actions = { analyze: onAnalyze, clear: onClear, copy: onCopy, export: onExport };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">操作</h2>
        <p className="mt-1 text-sm text-slate-500">统计后可复制到表格或导出 CSV</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
        {buttons.map(({ label, icon: Icon, action }) => {
          const disabled = action === "clear" ? !hasInput && !hasResults :
            action === "copy" || action === "export" ? !hasResults : false;
          const primary = action === "analyze";

          return (
            <button
              key={action}
              type="button"
              onClick={actions[action]}
              disabled={disabled}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                primary
                  ? "bg-teal-600 text-white shadow-sm hover:bg-teal-700"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none`}
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
