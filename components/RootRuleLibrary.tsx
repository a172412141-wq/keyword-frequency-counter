"use client";

import { useRef, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/keywordConfig";
import { createUserRootRule, normalizeUserRootRules } from "@/lib/rootRules";
import { ROOT_CATEGORIES, type UserRootRule } from "@/lib/keywordTypes";
import { DownloadIcon } from "./icons";

type Props = {
  rules: UserRootRule[];
  unsavedCorrectionCount: number;
  onChange: (rules: UserRootRule[]) => void;
  onSaveCurrentCorrections: () => void;
  onNotice: (message: string, tone?: "success" | "error") => void;
};

const fieldClass =
  "min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-teal-500 focus:outline-none";

export function RootRuleLibrary({
  rules,
  unsavedCorrectionCount,
  onChange,
  onSaveCurrentCorrections,
  onNotice,
}: Props) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validRuleCount = rules.filter((rule) => rule.phrase).length;

  function updateRule(id: string, patch: Partial<UserRootRule>) {
    onChange(
      rules.map((rule) =>
        rule.id === id ? { ...rule, ...patch, updatedAt: new Date().toISOString() } : rule,
      ),
    );
  }

  function exportRules() {
    const payload = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), rules: normalizeUserRootRules(rules) },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `keyword-root-rules-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    onNotice(`已导出 ${validRuleCount} 条词根规则`);
  }

  async function importRules(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const source =
        parsed && typeof parsed === "object" && "rules" in parsed
          ? (parsed as { rules: unknown }).rules
          : parsed;
      const imported = normalizeUserRootRules(source);
      if (imported.length === 0) throw new Error("没有有效规则");
      onChange(imported);
      setOpen(true);
      onNotice(`已导入 ${imported.length} 条词根规则`);
    } catch {
      onNotice("导入失败：请检查 JSON 文件格式和规则内容", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">我的词根规则库</h2>
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
              {validRuleCount} 条本地规则
            </span>
            {unsavedCorrectionCount > 0 && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                {unsavedCorrectionCount} 项待保存
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">人工修正保存后，下次识别相同词根时会优先应用</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSaveCurrentCorrections}
            disabled={unsavedCorrectionCount === 0}
            className="min-h-9 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            保存当前修正{unsavedCorrectionCount > 0 ? `（${unsavedCorrectionCount}）` : ""}
          </button>
          <button
            type="button"
            onClick={() => {
              onChange([...rules, createUserRootRule()]);
              setOpen(true);
            }}
            className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            新增规则
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            导入 JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importRules(file);
            }}
          />
          <button
            type="button"
            onClick={exportRules}
            disabled={validRuleCount === 0}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <DownloadIcon width={14} height={14} />
            导出 JSON
          </button>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="min-h-9 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            {open ? "收起规则" : "管理规则"}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200">
          {rules.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              暂无自定义规则。可以新增规则，或先在词根表格中修改后点击“保存当前修正”。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                    <th className="px-4 py-3">词根短语（1–4 词）</th>
                    <th className="px-4 py-3">归一词根</th>
                    <th className="px-4 py-3">分类</th>
                    <th className="px-4 py-3">同义词组 ID</th>
                    <th className="px-4 py-3">冲突组 ID</th>
                    <th className="px-4 py-3 text-center">默认启用</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-4 py-3">
                        <input
                          aria-label={`${rule.id} 词根短语`}
                          value={rule.phrase}
                          placeholder="例如 waterproof"
                          onChange={(event) =>
                            updateRule(rule.id, {
                              phrase: event.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/[-\s]+/g, " ").trimStart(),
                            })
                          }
                          className={`${fieldClass} font-mono`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          aria-label={`${rule.id} 归一词根`}
                          value={rule.canonicalRoot}
                          placeholder={rule.phrase || "canonical root"}
                          onChange={(event) =>
                            updateRule(rule.id, {
                              canonicalRoot: event.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/[-\s]+/g, " ").trimStart(),
                            })
                          }
                          className={`${fieldClass} font-mono`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`${rule.id} 分类`}
                          value={rule.category}
                          onChange={(event) =>
                            updateRule(rule.id, { category: event.target.value as UserRootRule["category"] })
                          }
                          className={fieldClass}
                        >
                          {ROOT_CATEGORIES.map((category) => (
                            <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <GroupInput
                          label={`${rule.id} 同义词组`}
                          value={rule.synonymGroupId}
                          onChange={(synonymGroupId) => updateRule(rule.id, { synonymGroupId })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <GroupInput
                          label={`${rule.id} 冲突组`}
                          value={rule.conflictGroupId}
                          onChange={(conflictGroupId) => updateRule(rule.id, { conflictGroupId })}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          aria-label={`${rule.id} 默认启用`}
                          type="checkbox"
                          checked={rule.defaultEnabled}
                          onChange={(event) => updateRule(rule.id, { defaultEnabled: event.target.checked })}
                          className="size-4 accent-teal-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => onChange(rules.filter((item) => item.id !== rule.id))}
                          className="min-h-8 rounded-lg px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rules.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>规则保存在当前浏览器；导出 JSON 可备份或迁移到其他设备。</p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("确定清空全部自定义词根规则吗？此操作无法撤销。")) {
                    onChange([]);
                    onNotice("已清空全部自定义词根规则");
                  }
                }}
                className="w-fit font-semibold text-rose-600 hover:text-rose-700"
              >
                清空规则库
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function GroupInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      aria-label={label}
      value={value}
      placeholder="留空表示无"
      onChange={(event) => onChange(event.target.value.toLowerCase().replace(/[^a-z0-9_\s-]/g, "").replace(/[-\s]+/g, "_"))}
      className={`${fieldClass} font-mono`}
    />
  );
}
