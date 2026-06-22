import type { CombinationSettings } from "@/lib/keywordTypes";

type Props = {
  settings: CombinationSettings;
  onChange: (patch: Partial<CombinationSettings>) => void;
};

const inputClass =
  "mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none";

export function CombinationSettingsPanel({ settings, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">组合规则</h2>
        <p className="mt-1 text-sm text-slate-500">调整后即时重新生成，无需再次点击</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-slate-600">
          组合模式
          <select
            className={inputClass}
            value={settings.mode}
            onChange={(event) => onChange({ mode: event.target.value as CombinationSettings["mode"] })}
          >
            <option value="precision">精准模式</option>
            <option value="expanded">扩展模式</option>
            <option value="full">全量模式</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          输出大小写
          <select
            className={inputClass}
            value={settings.outputCase}
            onChange={(event) =>
              onChange({ outputCase: event.target.value as CombinationSettings["outputCase"] })
            }
          >
            <option value="lowercase">lowercase</option>
            <option value="title">Title Case</option>
          </select>
        </label>
        <NumberField
          label="最少词根数"
          value={settings.minRoots}
          min={1}
          max={8}
          onChange={(minRoots) => onChange({ minRoots })}
        />
        <NumberField
          label="最多词根数"
          value={settings.maxRoots}
          min={1}
          max={8}
          onChange={(maxRoots) => onChange({ maxRoots })}
        />
        <NumberField
          label="最多功能 / 配件"
          value={settings.maxFeatures}
          min={0}
          max={5}
          onChange={(maxFeatures) => onChange({ maxFeatures })}
        />
        <NumberField
          label="最大输出数量"
          value={settings.maxResults}
          min={1}
          max={5000}
          step={50}
          onChange={(maxResults) => onChange({ maxResults })}
        />
      </div>

      <div className="mt-5 grid gap-2.5 border-t border-slate-100 pt-5 sm:grid-cols-3">
        <CheckSetting
          label="包含修饰词"
          checked={settings.includeModifier}
          onChange={(includeModifier) => onChange({ includeModifier })}
        />
        <CheckSetting
          label="包含目标人群"
          checked={settings.includeAudience}
          onChange={(includeAudience) => onChange({ includeAudience })}
        />
        <CheckSetting
          label="过滤噪音词"
          checked={settings.filterNoise}
          onChange={(filterNoise) => onChange({ filterNoise })}
        />
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      <input
        className={inputClass}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)));
        }}
      />
    </label>
  );
}

function CheckSetting({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-teal-600"
      />
      {label}
    </label>
  );
}
