"use client";

import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  SEGMENT_SUMMARIES,
  analyzeCompetitors,
  parseCompetitorRows,
  parseMetricNumber,
  type AppearanceRelevance,
  type CompetitorAnalysis,
  type CompetitorInput,
  type CompetitorSegment,
  type ProductMetrics,
} from "@/lib/asinCompetitorAnalyzer";
import { copyTextToClipboard } from "@/lib/clipboard";

type Notice = { message: string; tone: "success" | "error" };

type ManualMetrics = {
  price: string;
  smallCategoryRank: string;
  ratingCount: string;
  starRating: string;
};

type SellerSpriteLogin = {
  loginUrl: string;
  account: string;
  password: string;
};

const SEGMENT_ORDER: CompetitorSegment[] = [
  "strongRelated",
  "highCompetitiveness",
  "lowCompetitiveness",
  "weakRelated",
  "unrelated",
];

const SEGMENT_STYLES: Record<CompetitorSegment, string> = {
  strongRelated: "border-teal-200 bg-teal-50 text-teal-800",
  highCompetitiveness: "border-rose-200 bg-rose-50 text-rose-800",
  lowCompetitiveness: "border-emerald-200 bg-emerald-50 text-emerald-800",
  weakRelated: "border-amber-200 bg-amber-50 text-amber-800",
  unrelated: "border-slate-200 bg-slate-100 text-slate-700",
};

const SAMPLE_MY_ASIN = "B0MYASIN00";
const SAMPLE_ASIN_INPUT = `${SAMPLE_MY_ASIN}
B0HIGH0001
B0CORE0002
B0LOW00003
B0WEAK0004
B0MISS0005`;

const SAMPLE_PLUGIN_DATA = `ASIN\t标题\t类目\t售价\t小类排名\t评论数\t评分\t主图
B0MYASIN00\tExpandable Carry On Luggage with Spinner Wheels\tCarry-On Luggage\t29.99\t3200\t980\t4.6\t
B0HIGH0001\tExpandable Carry On Suitcase with Spinner Wheels\tCarry-On Luggage\t23.99\t2200\t4200\t4.7\t
B0CORE0002\tHard Shell Carry On Luggage TSA Lock\tCarry-On Luggage\t29.99\t3150\t1300\t4.6\t
B0LOW00003\tLightweight Carry On Suitcase for Travel\tCarry-On Luggage\t38.99\t5200\t260\t4.3\t
B0WEAK0004\tWeekender Travel Duffel Bag with Shoe Compartment\tTravel Duffel Bags\t21.99\t1800\t5600\t4.5\t`;

const DEFAULT_SELLERSPRITE_LOGIN_URL = "https://www.sellersprite.com/";

export function AsinCompetitorAnalyzerPanel() {
  const [asinText, setAsinText] = useState(SAMPLE_ASIN_INPUT);
  const [pluginText, setPluginText] = useState(SAMPLE_PLUGIN_DATA);
  const [sellerSpriteLogin, setSellerSpriteLogin] = useState<SellerSpriteLogin>({
    loginUrl: DEFAULT_SELLERSPRITE_LOGIN_URL,
    account: "",
    password: "",
  });
  const [showSellerPassword, setShowSellerPassword] = useState(false);
  const [manualMetrics, setManualMetrics] = useState<ManualMetrics>({
    price: "",
    smallCategoryRank: "",
    ratingCount: "",
    starRating: "",
  });
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const parsedPluginData = useMemo(() => parseCompetitorRows(pluginText), [pluginText]);
  const pluginDataByAsin = useMemo(() => buildProductDataMap(parsedPluginData.rows), [parsedPluginData.rows]);
  const allAsins = useMemo(() => parseAsinList(asinText), [asinText]);
  const normalizedMyAsin = allAsins[0] ?? "";
  const myPluginData = normalizedMyAsin ? pluginDataByAsin.get(normalizedMyAsin) : undefined;
  const competitorAsins = useMemo(() => allAsins.slice(1), [allAsins]);
  const effectiveCompetitorAsins = useMemo(() => {
    if (competitorAsins.length > 0) return competitorAsins;
    return parsedPluginData.rows
      .map((row) => normalizeAsin(row.asin))
      .filter((asin): asin is string => Boolean(asin) && asin !== normalizedMyAsin);
  }, [competitorAsins, normalizedMyAsin, parsedPluginData.rows]);

  const myProduct = useMemo<ProductMetrics>(
    () => ({
      asin: normalizedMyAsin || "MY-ASIN",
      title: myPluginData?.title,
      imageUrl: myPluginData?.imageUrl,
      category: myPluginData?.category,
      price: pickMetric(manualMetrics.price, myPluginData?.price),
      smallCategoryRank: pickMetric(manualMetrics.smallCategoryRank, myPluginData?.smallCategoryRank),
      ratingCount: pickMetric(manualMetrics.ratingCount, myPluginData?.ratingCount),
      starRating: pickMetric(manualMetrics.starRating, myPluginData?.starRating),
    }),
    [manualMetrics, myPluginData, normalizedMyAsin],
  );

  const competitors = useMemo<CompetitorInput[]>(
    () =>
      effectiveCompetitorAsins.map((asin, index) => {
        const pluginData = pluginDataByAsin.get(asin);
        const relevance = inferRelevance(myProduct, pluginData);
        return {
          asin,
          title: pluginData?.title,
          imageUrl: pluginData?.imageUrl,
          category: pluginData?.category,
          price: pluginData?.price,
          smallCategoryRank: pluginData?.smallCategoryRank,
          ratingCount: pluginData?.ratingCount,
          starRating: pluginData?.starRating,
          relevance,
          appearanceNote: buildAppearanceNote(myProduct, pluginData, relevance),
          sourceLine: index + 1,
        };
      }),
    [effectiveCompetitorAsins, myProduct, pluginDataByAsin],
  );

  const analyses = useMemo(() => analyzeCompetitors(myProduct, competitors), [competitors, myProduct]);
  const visibleAnalyses = useMemo(() => (hasAnalyzed ? analyses : []), [analyses, hasAnalyzed]);
  const groupedResults = useMemo(() => groupBySegment(visibleAnalyses), [visibleAnalyses]);
  const batchAsinText = useMemo(() => buildBatchAsinText(allAsins), [allAsins]);
  const resultCopyText = useMemo(
    () => (visibleAnalyses.length > 0 ? buildResultTsv(visibleAnalyses) : ""),
    [visibleAnalyses],
  );
  const matchedCompetitorCount = competitors.filter((competitor) => hasAnyMetric(competitor)).length;
  const missingMetricCount = competitors.reduce((sum, competitor) => sum + countMissingMetrics(competitor), 0);

  function resetAnalysis() {
    setHasAnalyzed(false);
    setNotice(null);
  }

  function showNotice(message: string, tone: Notice["tone"] = "success") {
    setNotice({ message, tone });
    window.setTimeout(() => {
      setNotice((current) => (current?.message === message ? null : current));
    }, 2400);
  }

  function updateManualMetric(field: keyof ManualMetrics, value: string) {
    setManualMetrics((current) => ({ ...current, [field]: value }));
    resetAnalysis();
  }

  function updateSellerSpriteLogin(field: keyof SellerSpriteLogin, value: string) {
    setSellerSpriteLogin((current) => ({ ...current, [field]: value }));
  }

  async function handleCopyLoginField(field: "account" | "password") {
    const value = sellerSpriteLogin[field].trim();
    if (!value) {
      showNotice(field === "account" ? "账号为空" : "密码为空", "error");
      return;
    }

    try {
      await copyTextToClipboard(value);
      showNotice(field === "account" ? "账号已复制" : "密码已复制");
    } catch {
      showNotice("复制失败，请检查浏览器权限", "error");
    }
  }

  function clearSellerSpriteLogin() {
    setSellerSpriteLogin({
      loginUrl: DEFAULT_SELLERSPRITE_LOGIN_URL,
      account: "",
      password: "",
    });
    setShowSellerPassword(false);
    showNotice("卖家精灵登录信息已清空");
  }

  function handleAnalyze() {
    if (!normalizedMyAsin) {
      setHasAnalyzed(false);
      showNotice("请输入我方 ASIN", "error");
      return;
    }

    if (effectiveCompetitorAsins.length === 0) {
      setHasAnalyzed(false);
      showNotice("请至少输入 1 个竞品 ASIN，第一行是我方 ASIN", "error");
      return;
    }

    setHasAnalyzed(true);
    showNotice(`已完成 ${effectiveCompetitorAsins.length} 个竞品分组`);
  }

  async function handleCopy() {
    if (visibleAnalyses.length === 0) {
      showNotice("暂无可复制结果", "error");
      return;
    }

    try {
      await copyTextToClipboard(buildResultTsv(visibleAnalyses));
      showNotice("结果已复制，可直接粘贴到 Excel");
    } catch {
      showNotice("复制失败，请检查浏览器权限", "error");
    }
  }

  function handleDownload() {
    if (visibleAnalyses.length === 0) {
      showNotice("暂无可导出结果", "error");
      return;
    }

    const blob = new Blob([`\uFEFF${buildResultCsv(visibleAnalyses)}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "asin-competitor-analysis.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showNotice("CSV 文件已导出");
  }

  async function handleCopyAsinBatch() {
    if (!batchAsinText) {
      showNotice("暂无可复制 ASIN", "error");
      return;
    }

    try {
      await copyTextToClipboard(batchAsinText);
      showNotice("ASIN 批量清单已复制");
    } catch {
      showNotice("复制失败，请检查浏览器权限", "error");
    }
  }

  function handleExportAsinBatch() {
    if (allAsins.length === 0) {
      showNotice("暂无可导出 ASIN", "error");
      return;
    }

    const rows = ["角色,ASIN", ...allAsins.map((asin, index) => `${index === 0 ? "我方" : "竞品"},${asin}`)];
    downloadTextFile("asin-batch-list.csv", `\uFEFF${rows.join("\r\n")}`, "text/csv;charset=utf-8");
    showNotice("ASIN 批量清单已导出");
  }

  return (
    <section className="space-y-6">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">ASIN 输入</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  只维护 ASIN，指标从免费插件导出的表格中自动匹配
                </p>
              </div>
              <span className="w-fit rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                插件导入模式
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">ASIN 清单</span>
                <textarea
                  value={asinText}
                  onChange={(event) => {
                    setAsinText(event.target.value.toUpperCase());
                    resetAnalysis();
                  }}
                  spellCheck={false}
                  className="mt-1 min-h-[190px] w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm font-semibold leading-6 text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none"
                  placeholder="第一行输入我的 ASIN，其余每行一个竞品 ASIN"
                />
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  第一行自动识别为我方 ASIN，后续 ASIN 自动识别为竞品池。
                </p>
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-600">一键复制区</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
                    {allAsins.length} 个 ASIN
                  </span>
                </div>
                <textarea
                  readOnly
                  value={batchAsinText}
                  className="min-h-[112px] w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm leading-6 text-slate-800"
                  placeholder="输入 ASIN 后自动生成"
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAsinBatch}
                    className="min-h-10 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    一键复制
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAsinBatch}
                    className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    批量导出
                  </button>
                </div>
              </div>
            </div>

            <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-700">
                我方指标手动兜底
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <MetricInput
                  label="价格"
                  value={manualMetrics.price}
                  onChange={(value) => updateManualMetric("price", value)}
                  placeholder={formatMoney(myPluginData?.price)}
                />
                <MetricInput
                  label="小类排名"
                  value={manualMetrics.smallCategoryRank}
                  onChange={(value) => updateManualMetric("smallCategoryRank", value)}
                  placeholder={formatInteger(myPluginData?.smallCategoryRank)}
                />
                <MetricInput
                  label="Rating数量"
                  value={manualMetrics.ratingCount}
                  onChange={(value) => updateManualMetric("ratingCount", value)}
                  placeholder={formatInteger(myPluginData?.ratingCount)}
                />
                <MetricInput
                  label="评星"
                  value={manualMetrics.starRating}
                  onChange={(value) => updateManualMetric("starRating", value)}
                  placeholder={formatDecimal(myPluginData?.starRating)}
                />
              </div>
            </details>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">卖家精灵账号</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  仅保存在当前浏览器页面内存中，刷新页面后不会保留，也不会进入导出结果。
                </p>
              </div>
              <span className="w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                本地临时
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <MetricInput
                label="登录入口"
                value={sellerSpriteLogin.loginUrl}
                onChange={(value) => updateSellerSpriteLogin("loginUrl", value)}
                placeholder={DEFAULT_SELLERSPRITE_LOGIN_URL}
              />
              <MetricInput
                label="账号"
                value={sellerSpriteLogin.account}
                onChange={(value) => updateSellerSpriteLogin("account", value)}
                placeholder="邮箱 / 手机号 / 用户名"
              />
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">密码</span>
                <input
                  value={sellerSpriteLogin.password}
                  type={showSellerPassword ? "text" : "password"}
                  autoComplete="off"
                  onChange={(event) => updateSellerSpriteLogin("password", event.target.value)}
                  placeholder="只在本页临时保存"
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={normalizeUrl(sellerSpriteLogin.loginUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                打开卖家精灵
              </a>
              <button
                type="button"
                onClick={() => void handleCopyLoginField("account")}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                复制账号
              </button>
              <button
                type="button"
                onClick={() => void handleCopyLoginField("password")}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                复制密码
              </button>
              <button
                type="button"
                onClick={() => setShowSellerPassword((current) => !current)}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                {showSellerPassword ? "隐藏密码" : "显示密码"}
              </button>
              <button
                type="button"
                onClick={clearSellerSpriteLogin}
                className="min-h-10 rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                清空
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">免费插件数据</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  从卖家精灵等插件复制或导出表格，粘贴后按 ASIN 自动匹配字段
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAsinText(SAMPLE_ASIN_INPUT);
                    setPluginText(SAMPLE_PLUGIN_DATA);
                    setManualMetrics({ price: "", smallCategoryRank: "", ratingCount: "", starRating: "" });
                    resetAnalysis();
                  }}
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  示例
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPluginText("ASIN\t标题\t类目\t售价\t小类排名\t评论数\t评分\t主图");
                    resetAnalysis();
                  }}
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  空模板
                </button>
              </div>
            </div>

            <label className="sr-only" htmlFor="plugin-data-input">
              免费插件数据输入
            </label>
            <textarea
              id="plugin-data-input"
              value={pluginText}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                setPluginText(event.target.value);
                resetAnalysis();
              }}
              spellCheck={false}
              className="min-h-[300px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 font-mono text-[14px] leading-7 text-slate-800 placeholder:text-slate-400 transition-colors focus:border-teal-500 focus:bg-white focus:outline-none"
              placeholder={SAMPLE_PLUGIN_DATA}
            />

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <StatusPill label="插件行" value={parsedPluginData.rows.length} />
                <StatusPill label="竞品 ASIN" value={effectiveCompetitorAsins.length} />
                <StatusPill label="已匹配" value={matchedCompetitorCount} tone="success" />
                {missingMetricCount > 0 ? (
                  <StatusPill label="缺字段" value={missingMetricCount} tone="warning" />
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  className="min-h-10 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  分析分组
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  复制结果
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  导出 CSV
                </button>
              </div>
            </div>

            {parsedPluginData.warnings.length > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                {parsedPluginData.warnings.slice(0, 3).join(" ")}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">数据匹配</h2>
            <div className="mt-4 space-y-3">
              <DataRow label="我方数据" value={myPluginData ? "已匹配" : "未匹配"} ok={Boolean(myPluginData)} />
              <DataRow label="价格" value={formatMoney(myProduct.price)} ok={myProduct.price !== undefined} />
              <DataRow label="小类排名" value={formatInteger(myProduct.smallCategoryRank)} ok={myProduct.smallCategoryRank !== undefined} />
              <DataRow label="Rating数量" value={formatInteger(myProduct.ratingCount)} ok={myProduct.ratingCount !== undefined} />
              <DataRow label="评星" value={formatDecimal(myProduct.starRating)} ok={myProduct.starRating !== undefined} />
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
              插件数据只用于补指标；外观相关性按类目和标题粗判，主图仍建议快速复核。
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">区间概览</h2>
            <div className="mt-4 space-y-2">
              {SEGMENT_ORDER.map((segment) => (
                <SegmentCounter
                  key={segment}
                  segment={segment}
                  count={groupedResults[segment].length}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-950">评分权重</h2>
            <div className="mt-4 space-y-3">
              <WeightRow label="评星 / Rating数量" value="50%" />
              <WeightRow label="小类排名" value="30%" />
              <WeightRow label="价格" value="20%" />
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">分组结果</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              综合分为正表示竞品更强，为负表示我方更强
            </p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {visibleAnalyses.length} 个结果
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-bold text-slate-700">结果一键复制区</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={visibleAnalyses.length === 0}
                className="min-h-9 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                一键复制
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={visibleAnalyses.length === 0}
                className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                批量导出
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={resultCopyText}
            className="min-h-[140px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs leading-5 text-slate-800"
            placeholder="点击“分析分组”后自动生成可复制结果"
          />
        </div>

        {visibleAnalyses.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            等待分析
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {SEGMENT_ORDER.map((segment) => (
              <ResultGroup
                key={segment}
                segment={segment}
                results={groupedResults[segment]}
              />
            ))}
          </div>
        )}
      </section>

      <div
        aria-live="polite"
        aria-atomic="true"
        className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
          notice ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        } ${notice?.tone === "error" ? "bg-rose-600" : "bg-slate-900"}`}
      >
        {notice?.message ?? ""}
      </div>
    </section>
  );
}

function MetricInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 transition focus:border-teal-500 focus:bg-white focus:outline-none"
      />
    </label>
  );
}

function StatusPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-2.5 py-1 ${className}`}>
      {label} {value}
    </span>
  );
}

function DataRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
          ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        }`}
      >
        {value || "-"}
      </span>
    </div>
  );
}

function SegmentCounter({ segment, count }: { segment: CompetitorSegment; count: number }) {
  const summary = SEGMENT_SUMMARIES[segment];

  return (
    <div className={`rounded-xl border px-3 py-3 ${SEGMENT_STYLES[segment]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">{summary.label}</span>
        <span className="text-lg font-black tabular-nums">{count}</span>
      </div>
      <p className="mt-1 text-xs leading-5 opacity-80">{summary.description}</p>
    </div>
  );
}

function WeightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
        {value}
      </span>
    </div>
  );
}

function ResultGroup({
  segment,
  results,
}: {
  segment: CompetitorSegment;
  results: CompetitorAnalysis[];
}) {
  const summary = SEGMENT_SUMMARIES[segment];

  if (results.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${SEGMENT_STYLES[segment]}`}>
          {summary.label}
        </span>
        <span className="text-xs font-semibold text-slate-400">{results.length} 个</span>
      </div>
      <div className="grid gap-3">
        {results.map((result) => (
          <ResultCard key={`${result.competitor.sourceLine}-${result.competitor.asin}`} result={result} />
        ))}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: CompetitorAnalysis }) {
  const competitor = result.competitor;
  const summary = SEGMENT_SUMMARIES[result.segment];

  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 open:bg-white">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 gap-3">
            {competitor.imageUrl ? (
              <div
                className="size-14 shrink-0 rounded-lg border border-slate-200 bg-white object-contain"
                style={{
                  backgroundImage: `url("${competitor.imageUrl.replaceAll('"', "%22")}")`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                }}
              />
            ) : (
              <div className="grid size-14 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-300">
                ASIN
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-black text-slate-950">{competitor.asin}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${SEGMENT_STYLES[result.segment]}`}>
                  {summary.shortLabel}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                  置信度 {result.confidence}
                </span>
              </div>
              {competitor.title ? (
                <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-700">{competitor.title}</p>
              ) : null}
              <p className="mt-1 line-clamp-1 text-sm leading-6 text-slate-500">
                {competitor.category || competitor.appearanceNote || "未匹配插件数据"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5 xl:min-w-[520px]">
            <MetricPill label="综合分" value={formatScore(result.score)} strong />
            <MetricPill label="价格" value={formatMoney(competitor.price)} />
            <MetricPill label="小类排名" value={formatInteger(competitor.smallCategoryRank)} />
            <MetricPill label="Rating" value={formatInteger(competitor.ratingCount)} />
            <MetricPill label="评星" value={formatDecimal(competitor.starRating)} />
          </div>
        </div>
      </summary>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {result.dimensions.map((dimension) => (
          <div key={dimension.key} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-900">{dimension.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  dimension.active ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {dimension.active ? formatScore(dimension.score) : "未计权"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{dimension.detail}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function MetricPill({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <div className="text-[11px] font-semibold text-slate-400">{label}</div>
      <div className={`mt-0.5 truncate font-bold tabular-nums ${strong ? "text-slate-950" : "text-slate-700"}`}>
        {value}
      </div>
    </div>
  );
}

function buildProductDataMap(rows: CompetitorInput[]): Map<string, CompetitorInput> {
  const map = new Map<string, CompetitorInput>();
  rows.forEach((row) => {
    const asin = normalizeAsin(row.asin);
    if (asin) map.set(asin, { ...row, asin });
  });
  return map;
}

function buildBatchAsinText(asins: string[]): string {
  return asins.join("\n");
}

function downloadTextFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function parseAsinList(input: string): string[] {
  const matches = input.toUpperCase().match(/\b[A-Z0-9]{10}\b/g) ?? [];
  return Array.from(new Set(matches));
}

function normalizeAsin(value: string | undefined): string {
  const match = value?.toUpperCase().match(/\b[A-Z0-9]{10}\b/);
  return match?.[0] ?? "";
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_SELLERSPRITE_LOGIN_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function pickMetric(manualValue: string, pluginValue: number | undefined): number | undefined {
  return parseMetricNumber(manualValue) ?? pluginValue;
}

function inferRelevance(
  myProduct: ProductMetrics,
  competitor: CompetitorInput | undefined,
): AppearanceRelevance {
  if (!competitor) return "strong";
  if (competitor.relevance !== "strong") return competitor.relevance;

  const categoryOverlap =
    Boolean(myProduct.category && competitor.category) &&
    normalizeText(myProduct.category) === normalizeText(competitor.category);
  const titleOverlap = getTokenOverlap(myProduct.title, competitor.title);

  if (categoryOverlap || titleOverlap >= 0.3) return "strong";
  if (myProduct.category && competitor.category && titleOverlap < 0.12) return "weak";
  return "strong";
}

function buildAppearanceNote(
  myProduct: ProductMetrics,
  competitor: CompetitorInput | undefined,
  relevance: AppearanceRelevance,
): string {
  if (!competitor) return "未在插件数据中匹配，指标缺失；先按强相关占位。";
  if (competitor.appearanceNote) return competitor.appearanceNote;
  if (relevance === "weak") return "类目或标题差异较大，按弱相关处理；建议用主图复核。";
  if (myProduct.category && competitor.category && normalizeText(myProduct.category) === normalizeText(competitor.category)) {
    return "类目一致，按强相关进入竞争力评分；建议用主图复核。";
  }
  return "按标题/类目粗判为强相关；建议用主图复核。";
}

function getTokenOverlap(left: string | undefined, right: string | undefined): number {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;
  const rightSet = new Set(rightTokens);
  const overlap = leftTokens.filter((token) => rightSet.has(token)).length;
  return overlap / Math.max(leftTokens.length, rightTokens.length);
}

function tokenize(value: string | undefined): string[] {
  if (!value) return [];
  const stopWords = new Set(["for", "with", "and", "the", "a", "an", "of", "in", "on", "to"]);
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function normalizeText(value: string | undefined): string {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function hasAnyMetric(product: ProductMetrics): boolean {
  return Boolean(
    product.price !== undefined ||
      product.smallCategoryRank !== undefined ||
      product.ratingCount !== undefined ||
      product.starRating !== undefined,
  );
}

function countMissingMetrics(product: ProductMetrics): number {
  return [
    product.price,
    product.smallCategoryRank,
    product.ratingCount,
    product.starRating,
  ].filter((value) => value === undefined).length;
}

function groupBySegment(results: CompetitorAnalysis[]): Record<CompetitorSegment, CompetitorAnalysis[]> {
  return SEGMENT_ORDER.reduce(
    (groups, segment) => {
      groups[segment] = results.filter((result) => result.segment === segment);
      return groups;
    },
    {
      strongRelated: [],
      highCompetitiveness: [],
      lowCompetitiveness: [],
      weakRelated: [],
      unrelated: [],
    } as Record<CompetitorSegment, CompetitorAnalysis[]>,
  );
}

function buildResultTsv(results: CompetitorAnalysis[]): string {
  const header = [
    "ASIN",
    "标题",
    "类目",
    "分组",
    "综合分",
    "价格",
    "小类排名",
    "Rating数量",
    "评星",
    "置信度",
    "判断摘要",
  ];
  const rows = results.map((result) =>
    [
      result.competitor.asin,
      result.competitor.title ?? "",
      result.competitor.category ?? "",
      SEGMENT_SUMMARIES[result.segment].label,
      formatScore(result.score),
      formatPlain(result.competitor.price),
      formatPlain(result.competitor.smallCategoryRank),
      formatPlain(result.competitor.ratingCount),
      formatPlain(result.competitor.starRating),
      result.confidence,
      result.dimensions.map((dimension) => `${dimension.label}: ${dimension.detail}`).join(" | "),
    ].join("\t"),
  );

  return [header.join("\t"), ...rows].join("\n");
}

function buildResultCsv(results: CompetitorAnalysis[]): string {
  return buildResultTsv(results)
    .split("\n")
    .map((row) => row.split("\t").map(escapeCsvCell).join(","))
    .join("\r\n");
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function formatScore(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}`;
  return value.toFixed(2);
}

function formatMoney(value: number | undefined): string {
  return value === undefined ? "-" : value.toFixed(2);
}

function formatInteger(value: number | undefined): string {
  return value === undefined ? "-" : Math.round(value).toLocaleString("en-US");
}

function formatDecimal(value: number | undefined): string {
  return value === undefined ? "-" : value.toFixed(1);
}

function formatPlain(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}
