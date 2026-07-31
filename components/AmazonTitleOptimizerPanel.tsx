"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from "react";

type ComplianceStatus = "PASS" | "FAIL";

type AplusSection = {
  section: string;
  format: string;
  content: string;
};

type TitleFields = {
  title: string;
  brand: string;
  core_keyword: string;
  attributes: string[];
  specifications: string[];
  use_case: string[];
  compliance_check: {
    has_keyword_stuffing: boolean;
    has_promotional_words: boolean;
    is_readable: boolean;
    missing_core_fields: string[];
  };
};

type ListingOptimizationResult = {
  original_title: string;
  optimized_title: string;
  title_fields?: TitleFields;
  title_status: ComplianceStatus;
  title_issues: string[];
  optimized_bullets: string[];
  bullet_status: ComplianceStatus;
  bullet_issues: string[];
  optimized_aplus: AplusSection[];
  aplus_status: ComplianceStatus;
  aplus_issues: string[];
};

const TITLE_OPTIMIZER_API_URL =
  process.env.NEXT_PUBLIC_TITLE_OPTIMIZER_API_URL || "http://127.0.0.1:8010";

const COMPLIANCE_RULES = [
  { code: "OVER_LENGTH", text: "标题长度超过 75 个字符" },
  { code: "PROMO_LANGUAGE", text: "包含 free shipping、best、sale、discount 等促销营销词" },
  { code: "INVALID_SYMBOLS", text: "包含 ! @ # $ % ^ & *" },
  { code: "FORMAT_NOISE", text: "过度使用 -、|、/ 或连续分隔符" },
  { code: "KEYWORD_STUFFING", text: "任意单词出现超过 2 次" },
  { code: "ALL_CAPS", text: "标题大部分为全大写，影响可读性" },
  { code: "MIXED_LANGUAGE", text: "英文标题混入非必要多语言内容" },
  { code: "MISSING_BRAND", text: "Brand 为空" },
  { code: "WEAK_STRUCTURE", text: "Product Type 未出现在标题前 30%" },
  { code: "VAGUE_PRODUCT_TYPE", text: "核心品类词过于模糊，如 product / item" },
  { code: "LOW_INFORMATION_DENSITY", text: "缺少关键属性或规格信息" },
  { code: "HYPERBOLE_RISK", text: "未验证的 waterproof、military grade、ultra durable、premium quality" },
];

const TITLE_OPTIMIZATION_STEPS = [
  "拆出品牌词、核心品类词、属性词、规格词和场景词",
  "合并同义词和重复词，删除无转化贡献词",
  "按核心词 > 属性词 > 规格词 > 场景词排序",
  "组合为 Brand + Product Type + 3-5 Key Features + Spec + Use Case",
  "过滤促销词、夸张 claim、非法符号、全大写和多语言混写",
  "优先保留品牌和核心品类，最终控制在 75 个字符以内",
];

const BULLET_GUIDANCE = [
  "最多 5 条，先讲卖点，再讲场景或收益",
  "第一条优先覆盖 Product Type、核心卖点和高意图关键词",
  "自然埋入长尾词，句子要美式、简洁、可读",
  "用材质、尺寸、兼容性、型号、包装等参数支撑卖点",
  "避免促销语、绝对化承诺和重复堆词",
];

const APLUS_GUIDANCE = [
  "A+ 重点服务转化，不承担关键词堆砌任务",
  "推荐结构：品牌故事、产品概述、核心卖点、规格参数、包装/FAQ",
  "说明产品是什么、独特之处、适用场景和优势",
  "长尾词自然出现即可，优先保持清晰版式和购买信心",
  "避免价格、促销、竞品比较和无证据的夸张承诺",
];

const TEMPLATE_COLUMNS = [
  { name: "Title", note: "必填，Amazon 产品标题" },
  { name: "Brand", note: "可选，缺失会标记 MISSING_BRAND" },
  { name: "Category", note: "可选，作为 Product Type 参考" },
  { name: "Bullet1", note: "可选，五点第 1 条" },
  { name: "Bullet2", note: "可选，五点第 2 条" },
  { name: "Bullet3", note: "可选，五点第 3 条" },
  { name: "Bullet4", note: "可选，五点第 4 条" },
  { name: "Bullet5", note: "可选，五点第 5 条" },
  { name: "APlusContent", note: "可选，现有 A+ 草稿或结构备注" },
];

export function AmazonTitleOptimizerPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isSingleLoading, setIsSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState("");
  const [batchError, setBatchError] = useState("");
  const [singleResult, setSingleResult] = useState<ListingOptimizationResult | null>(null);
  const [batchResults, setBatchResults] = useState<ListingOptimizationResult[]>([]);
  const [batchResultLabel, setBatchResultLabel] = useState("等待上传");
  const [singleTitle, setSingleTitle] = useState("");
  const [singleBrand, setSingleBrand] = useState("");
  const [singleCategory, setSingleCategory] = useState("");
  const [singleBullets, setSingleBullets] = useState("");
  const [singleAplus, setSingleAplus] = useState("");

  async function optimizeSingle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!singleTitle.trim()) {
      setSingleError("请输入需要优化的标题。");
      return;
    }

    setIsSingleLoading(true);
    setSingleError("");

    try {
      const response = await fetch(`${TITLE_OPTIMIZER_API_URL}/api/listing/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: singleTitle,
          brand: singleBrand,
          category: singleCategory,
          bullets: splitBullets(singleBullets),
          aplus_content: singleAplus,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as ListingOptimizationResult;
      setSingleResult(data);
    } catch (caughtError) {
      setSingleResult(null);
      setSingleError(
        caughtError instanceof Error ? caughtError.message : "Listing 优化失败，请确认本地标题优化服务已启动。",
      );
    } finally {
      setIsSingleLoading(false);
    }
  }

  async function processFile(file: File | undefined) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setBatchError("请上传 .xlsx Excel 文件。");
      setBatchResults([]);
      setFileName("");
      setBatchResultLabel("等待上传");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsBatchLoading(true);
    setBatchError("");
    setFileName(file.name);

    try {
      const response = await fetch(`${TITLE_OPTIMIZER_API_URL}/api/listing/batch-optimize`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const data = (await response.json()) as ListingOptimizationResult[];
      setBatchResults(data);
      setBatchResultLabel(`${file.name} · Listing 批量优化结果`);
    } catch (caughtError) {
      setBatchResults([]);
      setBatchResultLabel("等待上传");
      setBatchError(
        caughtError instanceof Error ? caughtError.message : "批量优化失败，请确认本地标题优化服务已启动。",
      );
    } finally {
      setIsBatchLoading(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void processFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void processFile(event.dataTransfer.files?.[0]);
  }

  function clearBatchResults() {
    setBatchResults([]);
    setBatchError("");
    setFileName("");
    setBatchResultLabel("等待上传");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function clearSingleInputs() {
    setSingleTitle("");
    setSingleBrand("");
    setSingleCategory("");
    setSingleBullets("");
    setSingleAplus("");
    setSingleResult(null);
    setSingleError("");
  }

  const isLoading = isSingleLoading || isBatchLoading;
  const passCount = batchResults.filter(isAllPass).length;
  const failCount = batchResults.length - passCount;

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <form onSubmit={optimizeSingle} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <PanelHeader
              eyebrow="单条 Listing 优化"
              title="标题、五点和 A+ 一次检查"
              description="标题规则以新版合规引擎为准；五点和 A+ 结合老版 Listing 文案经验输出结构化建议。"
            />

            <div className="space-y-4 p-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Title
                </span>
                <textarea
                  value={singleTitle}
                  onChange={(event) => setSingleTitle(event.target.value)}
                  placeholder="Acme best phone case case case waterproof!!! sale black 12oz"
                  className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Brand
                  </span>
                  <input
                    value={singleBrand}
                    onChange={(event) => setSingleBrand(event.target.value)}
                    placeholder="Acme"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category / Product Type
                  </span>
                  <input
                    value={singleCategory}
                    onChange={(event) => setSingleCategory(event.target.value)}
                    placeholder="Phone Case"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
                  />
                </label>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Five Bullet Drafts
                  </span>
                  <textarea
                    value={singleBullets}
                    onChange={(event) => setSingleBullets(event.target.value)}
                    placeholder={"每行一条五点，可留空让系统按标题生成建议\nSlim design for daily use\nSoft silicone case with anti slip grip"}
                    className="min-h-40 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    A+ Draft / Notes
                  </span>
                  <textarea
                    value={singleAplus}
                    onChange={(event) => setSingleAplus(event.target.value)}
                    placeholder="可粘贴现有 A+ 草稿、模块备注、规格参数或卖点摘要。留空则生成推荐版式。"
                    className="min-h-40 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSingleLoading}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSingleLoading ? "优化中..." : "单条优化"}
                </button>
                <button
                  type="button"
                  onClick={clearSingleInputs}
                  disabled={isSingleLoading}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  清空输入
                </button>
              </div>

              {singleError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  {singleError}
                </div>
              ) : null}

              {singleResult ? <SingleResultCard result={singleResult} /> : null}
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <PanelHeader
              eyebrow="批量 Listing 优化"
              title="上传 Excel 批量处理标题、五点和 A+"
              description="Excel 必需列为 Title；Brand、Category、Bullet1-5、APlusContent 可选。"
              action={
                <a
                  href={`${TITLE_OPTIMIZER_API_URL}/docs`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  API 文档
                </a>
              }
            />

            <div className="space-y-5 p-4">
              <TemplateHeaderReference />

              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex min-h-56 flex-col justify-between rounded-xl border-2 border-dashed p-5 transition ${
                    isDragging ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-600 text-lg font-bold text-white">
                      XLS
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-slate-950">
                      {fileName || "拖拽 Excel 到这里"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      上传后会返回标题、五点、A+版式建议和问题标签。
                    </p>
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".xlsx"
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      disabled={isBatchLoading}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isBatchLoading ? "处理中..." : "选择文件"}
                    </button>
                    <button
                      type="button"
                      onClick={clearBatchResults}
                      disabled={isLoading || (!fileName && !batchResults.length && !batchError)}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      清空结果
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <MetricCard label="已处理" value={batchResults.length} />
                  <MetricCard label="全项PASS" value={passCount} tone="pass" />
                  <MetricCard label="需处理" value={failCount} tone="fail" />
                </div>
              </div>
            </div>

            {batchError ? (
              <div className="mx-4 mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                {batchError}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <RuleReference />
        </aside>
      </div>

      <BatchResultsTable results={batchResults} label={batchResultLabel} />
    </section>
  );
}

function TemplateHeaderReference() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">空白模板表头</div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            批量 Excel 第一行请使用以下表头，列名大小写不敏感。
          </p>
        </div>
        <a
          href={`${TITLE_OPTIMIZER_API_URL}/api/listing/template`}
          download
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          下载空白模板
        </a>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-left text-sm">
          <thead className="bg-teal-50 text-xs uppercase tracking-wide text-teal-800">
            <tr>
              {TEMPLATE_COLUMNS.map((column) => (
                <th key={column.name} scope="col" className="min-w-36 px-3 py-2 font-bold">
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {TEMPLATE_COLUMNS.map((column) => (
                <td key={column.name} className="border-t border-slate-100 px-3 py-2 text-xs leading-5 text-slate-500">
                  {column.note}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BatchResultsTable({ results, label }: { results: ListingOptimizationResult[]; label: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-slate-950">批量优化结果</h2>
        <span className="text-sm text-slate-500">{results.length ? `${label} · ${results.length} 条` : label}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="min-w-72 px-4 py-3 font-semibold">Original Title</th>
              <th scope="col" className="min-w-72 px-4 py-3 font-semibold">Optimized Title</th>
              <th scope="col" className="min-w-96 px-4 py-3 font-semibold">Five Points</th>
              <th scope="col" className="min-w-96 px-4 py-3 font-semibold">A+ Layout</th>
              <th scope="col" className="min-w-72 px-4 py-3 font-semibold">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {results.map((result, index) => (
              <tr key={`${result.original_title}-${index}`} className="align-top">
                <td className="px-4 py-4 leading-6 text-slate-700">{result.original_title}</td>
                <td className="px-4 py-4">
                  <div className="mb-2"><StatusBadge status={result.title_status} /></div>
                  <p className="font-medium leading-6 text-slate-950">{result.optimized_title}</p>
                </td>
                <td className="px-4 py-4">
                  <BulletsList bullets={result.optimized_bullets} />
                </td>
                <td className="px-4 py-4">
                  <AplusList sections={result.optimized_aplus} compact />
                </td>
                <td className="px-4 py-4">
                  <IssueTags issues={allIssues(result)} />
                </td>
              </tr>
            ))}

            {!results.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                  上传 Excel 后显示批量 Listing 优化结果。单条优化结果会显示在上方输入板块内。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</div>
        <h2 className="mt-1 text-base font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{action}</div> : null}
    </div>
  );
}

function RuleReference() {
  return (
    <>
      <ReferenceCard eyebrow="标题准则" title="新规则为准">
        <div className="space-y-2">
          {COMPLIANCE_RULES.map((rule) => (
            <div key={rule.code} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="text-xs font-bold text-slate-900">{rule.code}</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{rule.text}</p>
            </div>
          ))}
        </div>
      </ReferenceCard>

      <ReferenceCard eyebrow="标题逻辑" title="优化流程">
        <ol className="space-y-2">
          {TITLE_OPTIMIZATION_STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="text-sm leading-6 text-slate-600">{step}</span>
            </li>
          ))}
        </ol>
      </ReferenceCard>

      <ReferenceCard eyebrow="五点" title="老版文案建议沉淀">
        <GuidanceList items={BULLET_GUIDANCE} />
      </ReferenceCard>

      <ReferenceCard eyebrow="A+" title="排版格式建议">
        <GuidanceList items={APLUS_GUIDANCE} />
      </ReferenceCard>
    </>
  );
}

function ReferenceCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</div>
      <h2 className="mt-1 text-base font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function GuidanceList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600">
          {item}
        </li>
      ))}
    </ul>
  );
}

function SingleResultCard({ result }: { result: ListingOptimizationResult }) {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">单条优化结果</div>
          <h3 className="mt-1 text-base font-bold text-slate-950">标题、五点和 A+ 建议</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={result.title_status} label="Title" />
          <StatusBadge status={result.bullet_status} label="Five Points" />
          <StatusBadge status={result.aplus_status} label="A+" />
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Optimized Title</div>
          <p className="mt-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-950">
            {result.optimized_title}
          </p>
          {result.title_fields ? <TitleFieldSummary fields={result.title_fields} /> : null}
          <IssueTags issues={result.title_issues} />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Five Points</div>
          <div className="mt-2 rounded-lg bg-white p-3">
            <BulletsList bullets={result.optimized_bullets} />
          </div>
          <IssueTags issues={result.bullet_issues} />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">A+ Layout</div>
          <div className="mt-2 rounded-lg bg-white p-3">
            <AplusList sections={result.optimized_aplus} />
          </div>
          <IssueTags issues={result.aplus_issues} />
        </div>
      </div>
    </div>
  );
}

function TitleFieldSummary({ fields }: { fields: TitleFields }) {
  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-slate-100 bg-white p-3 sm:grid-cols-2">
      <FieldLine label="Brand" value={fields.brand || "Missing"} />
      <FieldLine label="Core Keyword" value={fields.core_keyword || "Missing"} />
      <FieldLine label="Attributes" value={fields.attributes.join(", ") || "Missing"} />
      <FieldLine label="Specifications" value={fields.specifications.join(", ") || "Missing"} />
      <FieldLine label="Use Case" value={fields.use_case.join(", ") || "Optional"} />
      <FieldLine
        label="Checklist"
        value={
          fields.compliance_check.missing_core_fields.length
            ? `Missing: ${fields.compliance_check.missing_core_fields.join(", ")}`
            : fields.compliance_check.is_readable
              ? "Readable structure"
              : "Needs readability cleanup"
        }
      />
    </div>
  );
}

function FieldLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-xs font-medium leading-5 text-slate-700">{value}</div>
    </div>
  );
}

function BulletsList({ bullets }: { bullets: string[] }) {
  return (
    <ol className="space-y-2">
      {bullets.map((bullet, index) => (
        <li key={`${bullet}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            {index + 1}
          </span>
          <span>{bullet}</span>
        </li>
      ))}
    </ol>
  );
}

function AplusList({ sections, compact = false }: { sections: AplusSection[]; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {sections.map((section) => (
        <div key={section.section} className={compact ? "text-sm leading-6" : "rounded-lg border border-slate-100 p-3"}>
          <div className="font-semibold text-slate-950">{section.section}</div>
          <div className="text-xs font-medium text-teal-700">{section.format}</div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{section.content}</p>
        </div>
      ))}
    </div>
  );
}

function IssueTags({ issues }: { issues: string[] }) {
  if (!issues.length) {
    return <p className="mt-2 text-xs font-medium text-emerald-700">No issues</p>;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {issues.map((issue) => (
        <span
          key={issue}
          className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"
        >
          {issue}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status, label }: { status: ComplianceStatus; label?: string }) {
  const pass = status === "PASS";
  return (
    <span
      className={`inline-flex min-w-16 items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
        pass ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      {label ? `${label}: ${status}` : status}
    </span>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "pass" | "fail";
}) {
  const classes = {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    pass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    fail: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className={`rounded-xl border p-4 ${classes[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function splitBullets(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isAllPass(result: ListingOptimizationResult) {
  return result.title_status === "PASS" && result.bullet_status === "PASS" && result.aplus_status === "PASS";
}

function allIssues(result: ListingOptimizationResult) {
  return [...result.title_issues, ...result.bullet_issues, ...result.aplus_issues];
}

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    return "处理失败，请确认本地标题优化服务已启动。";
  }
  return "处理失败，请确认本地标题优化服务已启动。";
}
