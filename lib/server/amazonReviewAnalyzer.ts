import { buildStoredZip } from "./zipArchive";
import { isValidAsin, type ReviewMode } from "../reviewBatch";
import { buildReviewDocx, buildReviewPdf } from "./reviewReportDocuments";

type FetchLike = typeof fetch;

type RawReview = {
  Author?: string | null;
  HelpfulVotes?: number | null;
  Id?: string | number | null;
  ImageUrls?: unknown[] | null;
  IsVerifiedPurchase?: boolean | null;
  IsVineReview?: boolean | null;
  MediaUrls?: unknown[] | null;
  OriginDescription?: string | null;
  OverallRating?: number | null;
  Text?: string | null;
  Title?: string | null;
};

export type NormalizedReview = {
  sampleRowId: string;
  reviewId: string | null;
  rating: number;
  date: string | null;
  title: string;
  text: string;
  helpfulVotes: number;
  verifiedPurchase: boolean;
  vineReview: boolean;
  hasImages: boolean;
  hasVideo: boolean;
  originDescription: string;
};

type ThemeConfig = {
  label: string;
  patterns: RegExp[];
  action: string;
};

export type ThemeSummary = {
  key: string;
  label: string;
  count: number;
  shareOfSegment: number;
  action: string;
  examples: Array<{
    rating: number;
    date: string | null;
    title: string;
    excerpt: string;
    helpfulVotes: number;
  }>;
};

export type ReviewAnalysis = {
  asin: string;
  generatedAt: string;
  mode: ReviewMode;
  sample: {
    total: number;
    starCounts: Record<string, number>;
    lowStarCount: number;
    threeStarCount: number;
    highStarCount: number;
    verifiedCount: number;
    vineCount: number;
    withImages: number;
    withVideo: number;
    earliestDate: string | null;
    latestDate: string | null;
    usableReviewIdCount: number;
    designNote: string;
  };
  negativeThemes: ThemeSummary[];
  threeStarSignals: ThemeSummary[];
  positiveThemes: ThemeSummary[];
  frequentLowStarPhrases: Array<{ phrase: string; count: number }>;
  warnings: string[];
};

type ScrapeResult = {
  reviews: NormalizedReview[];
  warnings: string[];
};

const WOOT_BASE_URL = "https://www.woot.com/review/Reviews/";
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "X-Requested-With": "XMLHttpRequest",
};

const NEGATIVE_THEMES: Record<string, ThemeConfig> = {
  defects: {
    label: "故障、破损与耐用性",
    patterns: [
      /\b(break|broke|broken|crack|defect|fail|failed|failure|stopped working|fell apart|damaged)\b/i,
      /\b(flimsy|fragile|poor quality|not durable|cheaply made)\b/i,
    ],
    action: "拆分主要故障部位，按批次做寿命、跌落和满载测试，并将故障原因纳入退货编码。",
  },
  performance: {
    label: "性能或效果不符合预期",
    patterns: [
      /\b(doesn'?t work|does not work|didn'?t work|not working|ineffective|weak|slow|inaccurate)\b/i,
      /\b(performance|results?)\b.{0,80}\b(poor|bad|worse|disappoint)/i,
    ],
    action: "把核心性能主张改成可验证指标，补充真实使用条件并针对高频失效场景复测。",
  },
  sizeFitCompatibility: {
    label: "尺寸、适配或兼容性",
    patterns: [
      /\b(too small|too large|too big|too short|too long|too tight|too loose|doesn'?t fit|did not fit|not compatible|incompatible)\b/i,
      /\b(size|fit|compatible|compatibility)\b.{0,80}\b(wrong|problem|issue|poor|bad|not)\b/i,
    ],
    action: "用尺寸图、兼容清单和不适用范围降低误购，并明确测量口径和变体差异。",
  },
  usability: {
    label: "使用、安装或说明困难",
    patterns: [
      /\b(hard to use|difficult to use|confusing|hard to install|difficult to install|hard to assemble|instructions? unclear|no instructions?)\b/i,
      /\b(setup|assembly|install|instructions?|manual)\b.{0,80}\b(hard|difficult|confusing|missing|poor)\b/i,
    ],
    action: "增加上手步骤、安装图和故障排查，优先消除首次使用阶段的阻塞点。",
  },
  materials: {
    label: "材质、做工与触感",
    patterns: [
      /\b(cheap plastic|poor material|thin material|rough edge|sharp edge|bad stitching|poor stitching)\b/i,
      /\b(material|fabric|plastic|metal|finish|stitching|seam)\b.{0,80}\b(cheap|thin|rough|poor|bad|weak)\b/i,
    ],
    action: "核对材料与工艺规格，增加关键部位抽检，并避免在 Listing 中使用无法证明的高强度表述。",
  },
  missingParts: {
    label: "缺件、错件或配件不完整",
    patterns: [
      /\b(missing part|missing piece|missing pieces|parts missing|incomplete|wrong part|wrong item|didn'?t include|not included)\b/i,
    ],
    action: "增加装箱清单与重量校验，包装内外同步展示配件数量和缺件处理入口。",
  },
  deliveryCondition: {
    label: "包装、运输或到货状态",
    patterns: [
      /\b(arrived|delivered|shipping|package|packaging|box)\b.{0,100}\b(damaged|broken|open|crushed|dirty|used|torn|dent)\b/i,
      /\b(used item|previously returned|damaged on arrival)\b/i,
    ],
    action: "强化运输包装与出库检查，把疑似二手、到货破损和包装不足拆分统计。",
  },
  appearanceMismatch: {
    label: "颜色、外观或描述不一致",
    patterns: [
      /\b(color|colour|appearance|looks?|picture|photo|description)\b.{0,90}\b(different|wrong|misleading|not as|doesn'?t match|did not match)\b/i,
      /\b(not as pictured|not as described)\b/i,
    ],
    action: "用真实变体图片和自然光色卡降低预期差，检查子体图片、名称与发货变体是否一致。",
  },
  value: {
    label: "价格与价值感不足",
    patterns: [
      /\b(overpriced|not worth|waste of money|too expensive|pricey|poor value|not worth the money)\b/i,
    ],
    action: "重新匹配价格与可感知价值；若无法提升产品，减少过度承诺并明确目标使用频率。",
  },
  service: {
    label: "退换、保修与客服",
    patterns: [
      /\b(return|refund|replacement|warranty|customer service|support)\b.{0,100}\b(difficult|hard|refused|denied|poor|bad|no|not|won'?t|wouldn'?t)\b/i,
      /\b(return window|warranty is|no support)\b/i,
    ],
    action: "在 FAQ 中明确保修期限、索赔入口和所需证据，缩短首次解决时间。",
  },
  smellNoiseComfort: {
    label: "异味、噪音或舒适性",
    patterns: [
      /\b(bad smell|strong smell|chemical smell|odor|odour|too noisy|loud|uncomfortable|hurts?|painful)\b/i,
    ],
    action: "针对气味、噪音或人体接触部位建立体验测试，并在材料或结构层面排查原因。",
  },
};

const POSITIVE_THEMES: Record<string, ThemeConfig> = {
  quality: {
    label: "质量与耐用性",
    patterns: [/\b(good quality|great quality|well made|well-made|durable|sturdy|solid|held up|strong)\b/i],
    action: "保留真实耐用场景，但只使用经过材料、结构或寿命测试支持的表述。",
  },
  value: {
    label: "价格与性价比",
    patterns: [/\b(great value|good value|worth the price|worth it|great price|good price|bargain|for the money|affordable)\b/i],
    action: "把价格优势连接到具体使用收益，而不是只强调便宜。",
  },
  easeOfUse: {
    label: "易用、易安装或易清洁",
    patterns: [/\b(easy to use|easy to install|easy to assemble|easy to clean|simple to use|user friendly|user-friendly)\b/i],
    action: "用步骤图和真实场景放大低学习成本。",
  },
  performance: {
    label: "性能与效果",
    patterns: [/\b(works great|works well|worked perfectly|effective|does the job|performed well|great performance)\b/i],
    action: "提炼被反复验证的使用场景，并为核心效果补充可核实的证明。",
  },
  designAppearance: {
    label: "设计、颜色与外观",
    patterns: [/\b(love the color|beautiful|looks great|nice design|sleek|stylish|cute|attractive)\b/i],
    action: "把外观优势转化为实际场景价值，并确保主图与变体一致。",
  },
  sizeFit: {
    label: "尺寸、适配与兼容",
    patterns: [/\b(perfect fit|fits perfectly|perfect size|right size|compatible with|fit well|fits well)\b/i],
    action: "将高频成功适配场景写进兼容清单，同时保留边界条件。",
  },
  comfort: {
    label: "舒适度",
    patterns: [/\b(comfortable|comfy|soft|lightweight|easy to carry)\b/i],
    action: "用结构、重量或材料事实解释舒适来源，避免使用绝对化措辞。",
  },
  capacity: {
    label: "容量与收纳",
    patterns: [/\b(roomy|spacious|lots of space|plenty of space|great capacity|holds a lot|storage)\b/i],
    action: "用真实物品和尺寸参照展示容量，避免无法验证的夸张装载量。",
  },
  delivery: {
    label: "包装与到货体验",
    patterns: [/\b(well packaged|well-packaged|arrived safely|arrived quickly|fast delivery|good packaging)\b/i],
    action: "保留有效包装结构并监控运输破损率。",
  },
  service: {
    label: "客服与售后",
    patterns: [/\b(great customer service|excellent service|helpful support|quick replacement|easy return)\b/i],
    action: "把被验证的售后路径标准化，但不要承诺超出正式条款的服务。",
  },
};

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "amazon", "because", "been", "before", "being", "bought",
  "could", "didn", "does", "doesn", "from", "have", "just", "like", "more", "much", "only",
  "other", "over", "product", "really", "review", "some", "than", "that", "their", "them", "then",
  "there", "these", "they", "this", "those", "very", "want", "wasn", "were", "what", "when",
  "where", "which", "while", "with", "would", "your",
]);

export async function buildAmazonReviewPackage(
  asinInput: string,
  mode: ReviewMode = "full",
  fetcher: FetchLike = fetch,
) {
  const asin = asinInput.trim().toUpperCase();
  if (!isValidAsin(asin)) {
    throw new Error("ASIN 必须是 10 位字母或数字。");
  }
  if (!["basic", "full", "max"].includes(mode)) {
    throw new Error("不支持的采集模式。");
  }

  const scraped = await scrapeReviews(asin, mode, fetcher);
  if (scraped.reviews.length === 0) {
    throw new Error("上游评论接口没有返回可用评论；这不是有效的“0 评论”结果，请稍后重试。");
  }

  const analysis = analyzeReviewSample(asin, mode, scraped.reviews, scraped.warnings);
  const [docxReport, pdfReport] = await Promise.all([
    buildReviewDocx(analysis),
    buildReviewPdf(analysis),
  ]);
  const date = analysis.generatedAt.slice(0, 10);
  const folder = `${asin}_review-analysis_${date}`;
  const fileName = `${folder}.zip`;
  const entries = [
    {
      path: `${folder}/README.md`,
      data: renderPackageReadme(analysis),
    },
    {
      path: `${folder}/${asin}_review_analysis.md`,
      data: renderAnalysisMarkdown(analysis),
    },
    {
      path: `${folder}/${asin}_review_analysis.docx`,
      data: docxReport,
    },
    {
      path: `${folder}/${asin}_review_analysis.pdf`,
      data: pdfReport,
    },
    {
      path: `${folder}/${asin}_reviews.csv`,
      data: `\uFEFF${renderReviewsCsv(scraped.reviews)}`,
    },
    {
      path: `${folder}/${asin}_metrics.json`,
      data: JSON.stringify(analysis, null, 2),
    },
    {
      path: `${folder}/${asin}_product_opportunities.csv`,
      data: `\uFEFF${renderOpportunitiesCsv(analysis)}`,
    },
    {
      path: `${folder}/manifest.json`,
      data: JSON.stringify(
        {
          asin,
          generatedAt: analysis.generatedAt,
          marketplace: "Amazon US",
          mode,
          reviewCount: scraped.reviews.length,
          files: [
            "README.md",
            `${asin}_review_analysis.md`,
            `${asin}_review_analysis.docx`,
            `${asin}_review_analysis.pdf`,
            `${asin}_reviews.csv`,
            `${asin}_metrics.json`,
            `${asin}_product_opportunities.csv`,
          ],
          warnings: analysis.warnings,
        },
        null,
        2,
      ),
    },
  ];

  return {
    fileName,
    data: buildStoredZip(entries),
    analysis,
  };
}

export function analyzeReviewSample(
  asin: string,
  mode: ReviewMode,
  reviews: NormalizedReview[],
  warnings: string[] = [],
): ReviewAnalysis {
  const low = reviews.filter((review) => review.rating <= 2);
  const mid = reviews.filter((review) => review.rating === 3);
  const high = reviews.filter((review) => review.rating >= 4);
  const dates = reviews.map((review) => review.date).filter((date): date is string => Boolean(date)).sort();

  return {
    asin,
    generatedAt: new Date().toISOString(),
    mode,
    sample: {
      total: reviews.length,
      starCounts: countStars(reviews),
      lowStarCount: low.length,
      threeStarCount: mid.length,
      highStarCount: high.length,
      verifiedCount: reviews.filter((review) => review.verifiedPurchase).length,
      vineCount: reviews.filter((review) => review.vineReview).length,
      withImages: reviews.filter((review) => review.hasImages).length,
      withVideo: reviews.filter((review) => review.hasVideo).length,
      earliestDate: dates[0] ?? null,
      latestDate: dates.at(-1) ?? null,
      usableReviewIdCount: reviews.filter((review) => review.reviewId).length,
      designNote:
        "该样本按星级/排序窗口采集；样本均分和星级占比不能代表商品真实评分或真实差评率。主题比例只在对应星级段内解释。",
    },
    negativeThemes: summarizeThemes(low, NEGATIVE_THEMES),
    threeStarSignals: summarizeThemes(mid, NEGATIVE_THEMES),
    positiveThemes: summarizeThemes(high, POSITIVE_THEMES),
    frequentLowStarPhrases: frequentPhrases(low, 15),
    warnings,
  };
}

async function scrapeReviews(asin: string, mode: ReviewMode, fetcher: FetchLike): Promise<ScrapeResult> {
  const combinations =
    mode === "basic"
      ? [{ filter: 0, sort: 0 }]
      : mode === "full"
        ? [5, 4, 3, 2, 1].map((filter) => ({ filter, sort: 0 }))
        : [5, 4, 3, 2, 1].flatMap((filter) =>
            [0, 1, 2, 3].map((sort) => ({ filter, sort })),
          );
  const seen = new Set<string>();
  const rawReviews: RawReview[] = [];
  const warnings: string[] = [];

  for (const combination of combinations) {
    try {
      const batch = await fetchCombination(asin, combination.filter, combination.sort, fetcher);
      for (const review of batch) {
        const key = reviewDedupKey(review);
        if (seen.has(key)) continue;
        seen.add(key);
        rawReviews.push(review);
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "未知请求错误";
      warnings.push(`filter=${combination.filter}, sort=${combination.sort}: ${message}`);
    }
    await delay(120);
  }

  if (rawReviews.length === 0 && warnings.length > 0) {
    throw new Error(`评论接口请求失败：${warnings[0]}`);
  }

  const reviews = rawReviews.map((review, index) => normalizeReview(asin, review, index + 1));
  return { reviews, warnings };
}

async function fetchCombination(
  asin: string,
  filter: number,
  sort: number,
  fetcher: FetchLike,
): Promise<RawReview[]> {
  const reviews: RawReview[] = [];
  let pagingNext = "";

  for (let page = 1; page <= 12 && reviews.length < 100; page += 1) {
    const params = new URLSearchParams({
      filter: String(filter),
      isVerified: "false",
      sort: String(sort),
    });
    if (pagingNext) params.set("pagingNext", pagingNext);
    else params.set("page", "1");

    const url = `${WOOT_BASE_URL}${encodeURIComponent(asin)}?${params.toString()}`;
    const response = await fetchWithRetry(
      url,
      {
        headers: {
          ...REQUEST_HEADERS,
          Referer: `https://www.woot.com/review/${encodeURIComponent(asin)}`,
        },
      },
      fetcher,
    );
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    if (!contentType.toLowerCase().includes("json")) {
      throw new Error(`返回内容不是 JSON（${contentType || "unknown content type"}）`);
    }

    const payload = (await response.json()) as {
      Reviews?: RawReview[];
      PagingNext?: string | null;
    };
    const pageReviews = Array.isArray(payload.Reviews) ? payload.Reviews : [];
    if (pageReviews.length === 0) break;
    reviews.push(...pageReviews);
    pagingNext = typeof payload.PagingNext === "string" ? payload.PagingNext : "";
    if (!pagingNext) break;
    await delay(120);
  }

  return reviews.slice(0, 100);
}

async function fetchWithRetry(url: string, init: RequestInit, fetcher: FetchLike) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetcher(url, {
        ...init,
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
      if (response.status !== 429 && response.status < 500) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (caughtError) {
      lastError = caughtError;
    }
    await delay(350 * 2 ** attempt);
  }
  throw lastError instanceof Error ? lastError : new Error("网络请求失败");
}

function normalizeReview(asin: string, review: RawReview, index: number): NormalizedReview {
  return {
    sampleRowId: `${asin}-${String(index).padStart(4, "0")}`,
    reviewId:
      review.Id === null || review.Id === undefined || String(review.Id).trim() === ""
        ? null
        : String(review.Id),
    rating: clampRating(review.OverallRating),
    date: parseReviewDate(review.OriginDescription ?? ""),
    title: decodeHtml(review.Title ?? "").trim(),
    text: decodeHtml(review.Text ?? "").replaceAll("\u0000", "").trim(),
    helpfulVotes: Math.max(0, Number(review.HelpfulVotes) || 0),
    verifiedPurchase: Boolean(review.IsVerifiedPurchase),
    vineReview: Boolean(review.IsVineReview),
    hasImages: Array.isArray(review.ImageUrls) && review.ImageUrls.length > 0,
    hasVideo: Array.isArray(review.MediaUrls) && review.MediaUrls.length > 0,
    originDescription: review.OriginDescription ?? "",
  };
}

function summarizeThemes(
  reviews: NormalizedReview[],
  themes: Record<string, ThemeConfig>,
): ThemeSummary[] {
  return Object.entries(themes)
    .map(([key, config]) => {
      const matches = reviews.filter((review) => {
        const text = `${review.title}\n${review.text}`;
        return config.patterns.some((pattern) => pattern.test(text));
      });
      return {
        key,
        label: config.label,
        count: matches.length,
        shareOfSegment: reviews.length ? round4(matches.length / reviews.length) : 0,
        action: config.action,
        examples: [...matches]
          .sort((left, right) => right.helpfulVotes - left.helpfulVotes)
          .slice(0, 3)
          .map((review) => ({
            rating: review.rating,
            date: review.date,
            title: review.title,
            excerpt: review.text.replace(/\s+/g, " ").slice(0, 240),
            helpfulVotes: review.helpfulVotes,
          })),
      };
    })
    .filter((theme) => theme.count > 0)
    .sort((left, right) => right.count - left.count);
}

function frequentPhrases(reviews: NormalizedReview[], limit: number) {
  const counts = new Map<string, number>();
  for (const review of reviews) {
    const words = `${review.title} ${review.text}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
    const phrases = new Set<string>();
    for (let index = 0; index < words.length - 1; index += 1) {
      phrases.add(`${words[index]} ${words[index + 1]}`);
    }
    for (const phrase of phrases) counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

function renderPackageReadme(analysis: ReviewAnalysis) {
  return `# ${analysis.asin} 评论分析包

本包由 1SME 批量评论分析工具生成。

## 文件

- \`${analysis.asin}_review_analysis.md\`：中文分析报告
- \`${analysis.asin}_review_analysis.docx\`：可编辑的 Word 分析报告
- \`${analysis.asin}_review_analysis.pdf\`：便于预览和分享的 PDF 分析报告
- \`${analysis.asin}_reviews.csv\`：清洗后的完整评论样本
- \`${analysis.asin}_metrics.json\`：结构化分析指标
- \`${analysis.asin}_product_opportunities.csv\`：产品机会清单
- \`manifest.json\`：包信息与警告

## 重要说明

${analysis.sample.designNote}

评论数据来自公开评论接口，接口可能受地区、限流或上游策略影响。若请求失败，工具会明确报错，不会把请求失败当成“0 条评论”。
`;
}

function renderAnalysisMarkdown(analysis: ReviewAnalysis) {
  const sample = analysis.sample;
  const negativeRows = renderThemeRows(analysis.negativeThemes, sample.lowStarCount);
  const positiveRows = renderThemeRows(analysis.positiveThemes, sample.highStarCount);
  const midRows = renderThemeRows(analysis.threeStarSignals, sample.threeStarCount);
  const topNegative = analysis.negativeThemes.slice(0, 3);
  const opportunities = analysis.negativeThemes.slice(0, 8);
  const phrases = analysis.frequentLowStarPhrases
    .map((item) => `- \`${item.phrase}\`：${item.count} 条低星评论`)
    .join("\n");
  const warningText =
    analysis.warnings.length > 0
      ? analysis.warnings.map((warning) => `- ${warning}`).join("\n")
      : "- 无部分窗口失败警告";

  return `# ${analysis.asin} 评论分析

> 生成时间：${analysis.generatedAt}
> 模式：${modeLabel(analysis.mode)}
> 样本：${sample.total} 条书面评论

## 执行摘要

${
  topNegative.length > 0
    ? `低星评论最集中的方向是：${topNegative
        .map((theme) => `${theme.label}（${theme.count}/${sample.lowStarCount}）`)
        .join("、")}。`
    : "低星样本不足，暂时无法形成稳定的痛点排序。"
}

${sample.designNote}

## 样本概况

| 指标 | 数值 |
|---|---:|
| 总评论数 | ${sample.total} |
| 1/2/3/4/5 星样本 | ${[1, 2, 3, 4, 5].map((star) => sample.starCounts[String(star)] ?? 0).join(" / ")} |
| Verified Purchase | ${sample.verifiedCount} |
| Vine | ${sample.vineCount} |
| 含图片 / 视频 | ${sample.withImages} / ${sample.withVideo} |
| 日期范围 | ${sample.earliestDate ?? "未知"} 至 ${sample.latestDate ?? "未知"} |
| 可用评论 ID | ${sample.usableReviewIdCount} |

## 低星痛点

| 排名 | 主题 | 提及数 | 低星段占比 | 建议 |
|---:|---|---:|---:|---|
${negativeRows || "| - | 暂无稳定主题 | 0 | 0% | 增加样本后复核 |"}

## 高星价值点

| 排名 | 主题 | 提及数 | 高星段占比 | 建议 |
|---:|---|---:|---:|---|
${positiveRows || "| - | 暂无稳定主题 | 0 | 0% | 增加样本后复核 |"}

## 三星信号

| 排名 | 主题 | 提及数 | 三星段占比 | 建议 |
|---:|---|---:|---:|---|
${midRows || "| - | 暂无稳定主题 | 0 | 0% | 增加样本后复核 |"}

## 高频低星短语

${phrases || "- 低星文本不足，未生成高频短语。"}

## 产品机会优先级

${opportunities
  .map(
    (theme, index) =>
      `${index + 1}. **${theme.label}**：${theme.count}/${sample.lowStarCount} 条低星评论涉及。${theme.action}`,
  )
  .join("\n")}

## 代表性评论

${analysis.negativeThemes
  .slice(0, 5)
  .map(
    (theme) => `### ${theme.label}

${theme.examples
  .map(
    (example) =>
      `- ${example.rating}★ · ${example.date ?? "日期未知"} · helpful ${example.helpfulVotes} · **${escapeMarkdown(example.title || "无标题")}**：${escapeMarkdown(example.excerpt)}`,
  )
  .join("\n")}`,
  )
  .join("\n\n")}

## 采集警告

${warningText}
`;
}

function renderReviewsCsv(reviews: NormalizedReview[]) {
  const header = [
    "sample_row_id",
    "review_id",
    "date",
    "rating",
    "title",
    "review_text",
    "helpful_votes",
    "verified_purchase",
    "vine_review",
    "has_images",
    "has_video",
    "origin_description",
  ];
  const rows = reviews.map((review) => [
    review.sampleRowId,
    review.reviewId ?? "",
    review.date ?? "",
    review.rating,
    review.title,
    review.text,
    review.helpfulVotes,
    review.verifiedPurchase,
    review.vineReview,
    review.hasImages,
    review.hasVideo,
    review.originDescription,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function renderOpportunitiesCsv(analysis: ReviewAnalysis) {
  const header = ["priority", "theme", "evidence", "recommended_action"];
  const rows = analysis.negativeThemes.slice(0, 10).map((theme, index) => [
    index < 3 ? "P0" : index < 6 ? "P1" : "P2",
    theme.label,
    `${theme.count}/${analysis.sample.lowStarCount} low-star reviews (${formatPercent(theme.shareOfSegment)})`,
    theme.action,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function renderThemeRows(themes: ThemeSummary[], denominator: number) {
  return themes
    .slice(0, 8)
    .map(
      (theme, index) =>
        `| ${index + 1} | ${theme.label} | ${theme.count}/${denominator} | ${formatPercent(theme.shareOfSegment)} | ${theme.action} |`,
    )
    .join("\n");
}

function countStars(reviews: NormalizedReview[]) {
  return reviews.reduce<Record<string, number>>((counts, review) => {
    const key = String(review.rating);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function reviewDedupKey(review: RawReview) {
  return [review.Author ?? "", review.Title ?? "", (review.Text ?? "").slice(0, 100)]
    .map((value) => decodeHtml(String(value)).toLowerCase().replace(/\W+/g, ""))
    .join("|");
}

function parseReviewDate(description: string) {
  const match = description.match(/\bon\s+([A-Za-z]+ \d{1,2},?\s+\d{4})/);
  if (!match) return null;
  const parsed = new Date(match[1]);
  if (Number.isNaN(parsed.getTime())) return null;
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-");
}

function clampRating(value: unknown) {
  const rating = Math.round(Number(value) || 0);
  return Math.max(1, Math.min(5, rating));
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1").replace(/\s+/g, " ").trim();
}

function modeLabel(mode: ReviewMode) {
  if (mode === "basic") return "快速（单窗口，最多约 100 条）";
  if (mode === "full") return "标准（五星级分层，最多约 500 条）";
  return "最大化（星级 × 排序窗口）";
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
