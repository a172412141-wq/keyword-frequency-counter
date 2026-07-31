export type AppearanceRelevance = "strong" | "weak" | "none";

export type CompetitorSegment =
  | "strongRelated"
  | "highCompetitiveness"
  | "lowCompetitiveness"
  | "weakRelated"
  | "unrelated";

export type SegmentSummary = {
  label: string;
  shortLabel: string;
  description: string;
};

export const SEGMENT_SUMMARIES: Record<CompetitorSegment, SegmentSummary> = {
  strongRelated: {
    label: "强相关竞对",
    shortLabel: "强相关",
    description: "外观形态强相关，价格、排名、评价沉淀整体接近，可作为核心对标样本。",
  },
  highCompetitiveness: {
    label: "高竞争力竞对",
    shortLabel: "高竞争",
    description: "外观形态强相关，且竞品在评价、排名或价格上形成明显压力。",
  },
  lowCompetitiveness: {
    label: "低竞争力竞对",
    shortLabel: "低竞争",
    description: "外观形态强相关，但竞品综合竞争力弱于我方，可作为低威胁样本。",
  },
  weakRelated: {
    label: "弱相关竞对",
    shortLabel: "弱相关",
    description: "外观或使用场景有部分重合，可能影响流量方向，但不进入强竞争力对比。",
  },
  unrelated: {
    label: "无相关性竞对",
    shortLabel: "无相关",
    description: "外观形态或核心功能不匹配，不建议纳入当前竞品池。",
  },
};

export type RatingCountBucket = {
  label: string;
  index: number;
};

export type StarRatingBucket = {
  label: string;
  index: number;
};

export type ProductMetrics = {
  asin: string;
  title?: string;
  imageUrl?: string;
  category?: string;
  price?: number;
  smallCategoryRank?: number;
  ratingCount?: number;
  starRating?: number;
};

export type AppearanceSignals = {
  functionMatch?: boolean;
  sizeMatch?: boolean;
  materialMatch?: boolean;
  formMatch?: boolean;
};

export type CompetitorInput = ProductMetrics & {
  relevance: AppearanceRelevance;
  appearanceSignals?: AppearanceSignals;
  appearanceNote?: string;
  sourceLine?: number;
};

export type DimensionResult = {
  key: "appearance" | "review" | "rank" | "price";
  label: string;
  active: boolean;
  score: number;
  weight: number;
  detail: string;
};

export type CompetitorAnalysis = {
  competitor: CompetitorInput;
  segment: CompetitorSegment;
  score: number;
  confidence: "高" | "中" | "低";
  ratingCountBucket?: RatingCountBucket;
  starRatingBucket?: StarRatingBucket;
  dimensions: DimensionResult[];
};

export type ParsedCompetitorRows = {
  rows: CompetitorInput[];
  warnings: string[];
};

const PRICE_WEIGHT = 0.2;
const RANK_WEIGHT = 0.3;
const REVIEW_WEIGHT = 0.5;
const SCORE_THRESHOLD = 0.28;

const RATING_COUNT_BUCKETS: Array<RatingCountBucket & { min: number; max: number }> = [
  { label: "100内", index: 0, min: 0, max: 99 },
  { label: "100-300（低百）", index: 1, min: 100, max: 299 },
  { label: "300-1000（高百）", index: 2, min: 300, max: 999 },
  { label: "1000-3000（低千）", index: 3, min: 1000, max: 2999 },
  { label: "3000+（高千）", index: 4, min: 3000, max: 9999 },
  { label: "万级", index: 5, min: 10000, max: Number.POSITIVE_INFINITY },
];

const STAR_RATING_BUCKETS: Array<StarRatingBucket & { min: number; max: number }> = [
  { label: "4.0以下", index: 0, min: 0, max: 3.99 },
  { label: "4.0-4.2", index: 1, min: 4, max: 4.29 },
  { label: "4.3-4.5", index: 2, min: 4.3, max: 4.59 },
  { label: "4.6-4.8", index: 3, min: 4.6, max: 4.8 },
  { label: "4.8以上", index: 4, min: 4.81, max: 5 },
];

export function analyzeCompetitors(
  myProduct: ProductMetrics,
  competitors: CompetitorInput[],
): CompetitorAnalysis[] {
  return competitors.map((competitor) => analyzeCompetitor(myProduct, competitor));
}

export function analyzeCompetitor(
  myProduct: ProductMetrics,
  competitor: CompetitorInput,
): CompetitorAnalysis {
  const appearance = analyzeAppearance(competitor);
  const review = analyzeReview(myProduct, competitor);
  const rank = analyzeRank(myProduct, competitor);
  const price = analyzePrice(myProduct, competitor);
  const dimensions = [appearance, review, rank, price];

  if (competitor.relevance === "none") {
    return buildAnalysis(competitor, "unrelated", 0, dimensions);
  }

  if (competitor.relevance === "weak") {
    return buildAnalysis(competitor, "weakRelated", 0, dimensions);
  }

  const activeDimensions = [review, rank, price].filter((dimension) => dimension.active);
  const totalWeight = activeDimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  const score =
    totalWeight > 0
      ? activeDimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0) /
        totalWeight
      : 0;

  if (score >= SCORE_THRESHOLD) {
    return buildAnalysis(competitor, "highCompetitiveness", score, dimensions);
  }

  if (score <= -SCORE_THRESHOLD) {
    return buildAnalysis(competitor, "lowCompetitiveness", score, dimensions);
  }

  return buildAnalysis(competitor, "strongRelated", score, dimensions);
}

export function getRatingCountBucket(count: number | undefined): RatingCountBucket | undefined {
  if (!isFinitePositiveNumber(count)) return undefined;
  return RATING_COUNT_BUCKETS.find((bucket) => count >= bucket.min && count <= bucket.max);
}

export function getStarRatingBucket(starRating: number | undefined): StarRatingBucket | undefined {
  if (!isFinitePositiveNumber(starRating)) return undefined;
  return STAR_RATING_BUCKETS.find((bucket) => starRating >= bucket.min && starRating <= bucket.max);
}

export function deriveAppearanceRelevance(
  signals: AppearanceSignals,
  fallback: AppearanceRelevance = "strong",
): AppearanceRelevance {
  const knownSignals = [
    signals.functionMatch,
    signals.sizeMatch,
    signals.materialMatch,
    signals.formMatch,
  ].filter((value): value is boolean => value !== undefined);

  if (knownSignals.length === 0) return fallback;

  const matchedCount = knownSignals.filter(Boolean).length;
  if (signals.functionMatch === false && matchedCount <= 1) return "none";
  if (signals.functionMatch === true && matchedCount >= 3) return "strong";
  if (matchedCount >= 3) return "strong";
  if (matchedCount >= 1) return "weak";
  return "none";
}

export function parseCompetitorRows(input: string): ParsedCompetitorRows {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const warnings: string[] = [];
  if (lines.length === 0) return { rows: [], warnings };

  const firstCells = splitInputLine(lines[0]);
  const headerMap = buildHeaderMap(firstCells);
  const hasHeader = headerMap.has("asin") && headerMap.size >= 3;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: CompetitorInput[] = [];

  dataLines.forEach((line, index) => {
    const sourceLine = hasHeader ? index + 2 : index + 1;
    const cells = splitInputLine(line);
    const parsed = hasHeader
      ? parseCellsWithHeader(cells, headerMap, sourceLine)
      : parseCellsByPosition(cells, sourceLine);

    if (parsed) {
      rows.push(parsed);
    } else {
      warnings.push(`第 ${sourceLine} 行未识别，已跳过。`);
    }
  });

  return { rows, warnings };
}

export function parseMetricNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const compact = value.trim().toLowerCase().replaceAll(",", "").replaceAll("，", "");
  if (!compact) return undefined;

  const match = compact.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;

  const parsed = Number(match[0]);
  if (!Number.isFinite(parsed)) return undefined;

  if (/[万w]/i.test(compact)) return parsed * 10000;
  if (/[k千]/i.test(compact)) return parsed * 1000;
  return parsed;
}

export function parseRelevanceCell(value: string | undefined): AppearanceRelevance | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (
    normalized === "0" ||
    normalized.includes("无") ||
    normalized.includes("不相关") ||
    normalized.includes("none") ||
    normalized.includes("irrelevant")
  ) {
    return "none";
  }

  if (
    normalized === "3" ||
    normalized.includes("强") ||
    normalized.includes("高") ||
    normalized.includes("直接") ||
    normalized.includes("同款") ||
    normalized.includes("相同") ||
    normalized.includes("same") ||
    normalized.includes("strong") ||
    normalized.includes("direct")
  ) {
    return "strong";
  }

  if (
    normalized === "2" ||
    normalized === "1" ||
    normalized.includes("弱") ||
    normalized.includes("部分") ||
    normalized.includes("相似") ||
    normalized.includes("相邻") ||
    normalized.includes("weak") ||
    normalized.includes("partial") ||
    normalized.includes("similar") ||
    normalized.includes("related")
  ) {
    return "weak";
  }

  return undefined;
}

export function parseBooleanSignal(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;

  if (
    normalized === "0" ||
    normalized === "n" ||
    normalized === "no" ||
    normalized === "false" ||
    normalized === "x" ||
    normalized.includes("否") ||
    normalized.includes("不") ||
    normalized.includes("不同")
  ) {
    return false;
  }

  if (
    normalized === "1" ||
    normalized === "y" ||
    normalized === "yes" ||
    normalized === "true" ||
    normalized.includes("是") ||
    normalized.includes("同") ||
    normalized.includes("匹配") ||
    normalized.includes("match") ||
    normalized.includes("same")
  ) {
    return true;
  }

  return undefined;
}

function analyzeAppearance(competitor: CompetitorInput): DimensionResult {
  const detailByRelevance: Record<AppearanceRelevance, string> = {
    strong: "外观形态强相关，进入竞争力评分。",
    weak: "外观形态弱相关，只作为流量方向参考，不进入强竞争力评分。",
    none: "外观形态无相关性，直接归入无相关性竞对。",
  };

  const note = competitor.appearanceNote ? ` ${competitor.appearanceNote}` : "";
  return {
    key: "appearance",
    label: "外观形态",
    active: true,
    score: competitor.relevance === "strong" ? 1 : 0,
    weight: 1,
    detail: `${detailByRelevance[competitor.relevance]}${note}`,
  };
}

function analyzePrice(myProduct: ProductMetrics, competitor: ProductMetrics): DimensionResult {
  const myPrice = myProduct.price;
  const competitorPrice = competitor.price;
  if (!isFinitePositiveNumber(myPrice) || !isFinitePositiveNumber(competitorPrice)) {
    return inactiveDimension("price", "价格", PRICE_WEIGHT, "缺少我方或竞品价格，价格不参与评分。");
  }

  const delta = (competitorPrice - myPrice) / myPrice;
  if (delta < -0.15) {
    return {
      key: "price",
      label: "价格",
      active: true,
      score: 1,
      weight: PRICE_WEIGHT,
      detail: `竞品价格低于我方 ${formatPercent(Math.abs(delta))}，价格端竞品更有冲击。`,
    };
  }

  if (delta > 0.15) {
    return {
      key: "price",
      label: "价格",
      active: true,
      score: -1,
      weight: PRICE_WEIGHT,
      detail: `竞品价格高于我方 ${formatPercent(delta)}，价格端我方更有竞争力。`,
    };
  }

  return {
    key: "price",
    label: "价格",
    active: true,
    score: 0,
    weight: PRICE_WEIGHT,
    detail: `价格差 ${formatPercent(Math.abs(delta))}，处于正负 15% 同价格段。`,
  };
}

function analyzeRank(myProduct: ProductMetrics, competitor: ProductMetrics): DimensionResult {
  const myRank = myProduct.smallCategoryRank;
  const competitorRank = competitor.smallCategoryRank;
  if (!isFinitePositiveNumber(myRank) || !isFinitePositiveNumber(competitorRank)) {
    return inactiveDimension("rank", "小类排名", RANK_WEIGHT, "缺少我方或竞品小类排名，排名不参与评分。");
  }

  const delta = (competitorRank - myRank) / myRank;
  if (delta < -0.2) {
    return {
      key: "rank",
      label: "小类排名",
      active: true,
      score: 1,
      weight: RANK_WEIGHT,
      detail: `竞品排名数值低于我方 ${formatPercent(Math.abs(delta))}，竞品排名优势明显。`,
    };
  }

  if (delta > 0.2) {
    return {
      key: "rank",
      label: "小类排名",
      active: true,
      score: -1,
      weight: RANK_WEIGHT,
      detail: `竞品排名数值高于我方 ${formatPercent(delta)}，排名端我方更有竞争力。`,
    };
  }

  return {
    key: "rank",
    label: "小类排名",
    active: true,
    score: 0,
    weight: RANK_WEIGHT,
    detail: `排名差 ${formatPercent(Math.abs(delta))}，处于正负 20% 同竞争力区间。`,
  };
}

function analyzeReview(myProduct: ProductMetrics, competitor: ProductMetrics): DimensionResult {
  const myCountBucket = getRatingCountBucket(myProduct.ratingCount);
  const competitorCountBucket = getRatingCountBucket(competitor.ratingCount);
  const myStarBucket = getStarRatingBucket(myProduct.starRating);
  const competitorStarBucket = getStarRatingBucket(competitor.starRating);
  const reviewParts: Array<{ score: number; weight: number }> = [];
  const details: string[] = [];

  if (
    isFinitePositiveNumber(myProduct.ratingCount) &&
    isFinitePositiveNumber(competitor.ratingCount) &&
    myCountBucket &&
    competitorCountBucket
  ) {
    const largestCount = Math.max(myProduct.ratingCount, competitor.ratingCount);
    if (largestCount <= 30) {
      details.push("Rating 数量双方均在 30 内，按低可信样本处理，数量基本不计权。");
    } else {
      const countScore = compareBucketIndex(competitorCountBucket.index, myCountBucket.index);
      reviewParts.push({ score: countScore, weight: 0.5 });
      details.push(
        `Rating 数量：我方 ${myCountBucket.label}，竞品 ${competitorCountBucket.label}。${describeScore(
          countScore,
        )}`,
      );
    }
  } else {
    details.push("缺少我方或竞品 Rating 数量，数量不参与评分。");
  }

  if (
    isFinitePositiveNumber(myProduct.ratingCount) &&
    isFinitePositiveNumber(competitor.ratingCount) &&
    myProduct.ratingCount > 100 &&
    competitor.ratingCount > 100 &&
    myStarBucket &&
    competitorStarBucket
  ) {
    const starScore = compareBucketIndex(competitorStarBucket.index, myStarBucket.index);
    reviewParts.push({ score: starScore, weight: 0.5 });
    details.push(
      `评星：我方 ${myStarBucket.label}，竞品 ${competitorStarBucket.label}。${describeScore(
        starScore,
      )}`,
    );
  } else {
    details.push("评星仅在双方 Rating 数量均大于 100 时参与参考。");
  }

  if (reviewParts.length === 0) {
    return inactiveDimension("review", "评星 / Rating 数量", REVIEW_WEIGHT, details.join(" "));
  }

  const totalWeight = reviewParts.reduce((sum, part) => sum + part.weight, 0);
  const score = reviewParts.reduce((sum, part) => sum + part.score * part.weight, 0) / totalWeight;

  return {
    key: "review",
    label: "评星 / Rating 数量",
    active: true,
    score,
    weight: REVIEW_WEIGHT,
    detail: details.join(" "),
  };
}

function buildAnalysis(
  competitor: CompetitorInput,
  segment: CompetitorSegment,
  score: number,
  dimensions: DimensionResult[],
): CompetitorAnalysis {
  return {
    competitor,
    segment,
    score: roundScore(score),
    confidence: getConfidence(competitor.relevance, dimensions),
    ratingCountBucket: getRatingCountBucket(competitor.ratingCount),
    starRatingBucket: getStarRatingBucket(competitor.starRating),
    dimensions,
  };
}

function getConfidence(
  relevance: AppearanceRelevance,
  dimensions: DimensionResult[],
): "高" | "中" | "低" {
  if (relevance !== "strong") return relevance === "weak" ? "中" : "高";
  const activeScoredDimensions = dimensions.filter(
    (dimension) => dimension.key !== "appearance" && dimension.active,
  ).length;
  if (activeScoredDimensions >= 3) return "高";
  if (activeScoredDimensions >= 2) return "中";
  return "低";
}

function inactiveDimension(
  key: DimensionResult["key"],
  label: string,
  weight: number,
  detail: string,
): DimensionResult {
  return {
    key,
    label,
    active: false,
    score: 0,
    weight,
    detail,
  };
}

function compareBucketIndex(competitorIndex: number, myIndex: number): number {
  const diff = competitorIndex - myIndex;
  if (diff === 0) return 0;
  return Math.max(-1, Math.min(1, diff / 2));
}

function describeScore(score: number): string {
  if (score > 0.2) return "竞品更强。";
  if (score < -0.2) return "我方更强。";
  return "双方接近。";
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function isFinitePositiveNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseCellsWithHeader(
  cells: string[],
  headerMap: Map<string, number>,
  sourceLine: number,
): CompetitorInput | null {
  const get = (key: string) => {
    const index = headerMap.get(key);
    return index === undefined ? undefined : cells[index];
  };
  const asin = get("asin")?.trim();
  if (!asin) return null;

  const appearanceSignals = {
    functionMatch: parseBooleanSignal(get("functionMatch")),
    sizeMatch: parseBooleanSignal(get("sizeMatch")),
    materialMatch: parseBooleanSignal(get("materialMatch")),
    formMatch: parseBooleanSignal(get("formMatch")),
  };
  const explicitRelevance = parseRelevanceCell(get("relevance"));
  const relevance = explicitRelevance ?? deriveAppearanceRelevance(appearanceSignals);

  return {
    asin,
    relevance,
    appearanceSignals,
    appearanceNote: get("appearanceNote")?.trim(),
    price: parseMetricNumber(get("price")),
    smallCategoryRank: parseMetricNumber(get("rank")),
    ratingCount: parseMetricNumber(get("ratingCount")),
    starRating: parseMetricNumber(get("starRating")),
    title: get("title")?.trim(),
    imageUrl: get("imageUrl")?.trim(),
    category: get("category")?.trim(),
    sourceLine,
  };
}

function parseCellsByPosition(cells: string[], sourceLine: number): CompetitorInput | null {
  const asin = cells[0]?.trim();
  if (!asin) return null;

  if (cells.length >= 9) {
    const appearanceSignals = {
      functionMatch: parseBooleanSignal(cells[1]),
      sizeMatch: parseBooleanSignal(cells[2]),
      materialMatch: parseBooleanSignal(cells[3]),
      formMatch: parseBooleanSignal(cells[4]),
    };

    return {
      asin,
      relevance: deriveAppearanceRelevance(appearanceSignals),
      appearanceSignals,
      price: parseMetricNumber(cells[5]),
      smallCategoryRank: parseMetricNumber(cells[6]),
      ratingCount: parseMetricNumber(cells[7]),
      starRating: parseMetricNumber(cells[8]),
      appearanceNote: cells.slice(9).join(" ").trim(),
      sourceLine,
    };
  }

  if (cells.length >= 6) {
    return {
      asin,
      relevance: parseRelevanceCell(cells[1]) ?? "strong",
      price: parseMetricNumber(cells[2]),
      smallCategoryRank: parseMetricNumber(cells[3]),
      ratingCount: parseMetricNumber(cells[4]),
      starRating: parseMetricNumber(cells[5]),
      appearanceNote: cells.slice(6).join(" ").trim(),
      sourceLine,
    };
  }

  return null;
}

function splitInputLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((cell) => cell.trim());
  if (line.includes(",")) return splitDelimitedLine(line, ",");
  return line.split(/\s+/).map((cell) => cell.trim());
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function buildHeaderMap(cells: string[]): Map<string, number> {
  const map = new Map<string, number>();
  cells.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    if (key && !map.has(key)) map.set(key, index);
  });
  return map;
}

function normalizeHeader(value: string): string | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[()\[\]（）【】_\-\s]/g, "");

  if (!normalized) return null;
  if (normalized === "asin" || normalized.includes("竞品asin")) return "asin";
  if (normalized.includes("标题") || normalized.includes("title") || normalized.includes("商品名")) {
    return "title";
  }
  if (
    normalized.includes("主图") ||
    normalized.includes("图片") ||
    normalized.includes("image") ||
    normalized.includes("img")
  ) {
    return "imageUrl";
  }
  if (
    normalized.includes("类目") ||
    normalized.includes("分类") ||
    normalized.includes("category") ||
    normalized.includes("browsenode")
  ) {
    if (normalized.includes("排名") || normalized.includes("rank") || normalized.includes("bsr")) {
      return "rank";
    }
    return "category";
  }
  if (normalized.includes("外观相关") || normalized === "相关性" || normalized.includes("relevance")) {
    return "relevance";
  }
  if (normalized.includes("功能")) return "functionMatch";
  if (normalized.includes("尺寸") || normalized.includes("size")) return "sizeMatch";
  if (normalized.includes("材质") || normalized.includes("material")) return "materialMatch";
  if (normalized.includes("形态") || normalized.includes("form") || normalized.includes("shape")) {
    return "formMatch";
  }
  if (
    normalized.includes("价格") ||
    normalized.includes("售价") ||
    normalized.includes("当前价") ||
    normalized.includes("price")
  ) {
    return "price";
  }
  if (normalized.includes("小类") || normalized.includes("排名") || normalized.includes("rank") || normalized.includes("bsr")) {
    return "rank";
  }
  if (
    normalized.includes("rating数量") ||
    normalized.includes("ratingcount") ||
    normalized === "ratings" ||
    normalized.includes("评分数") ||
    normalized.includes("rating数") ||
    normalized.includes("评论") ||
    normalized.includes("评价数") ||
    normalized.includes("review")
  ) {
    return "ratingCount";
  }
  if (
    normalized.includes("评星") ||
    normalized.includes("评分") ||
    normalized.includes("星级") ||
    normalized.includes("star") ||
    normalized === "rating"
  ) {
    return "starRating";
  }
  if (normalized.includes("备注") || normalized.includes("主图") || normalized.includes("note")) {
    return "appearanceNote";
  }
  return null;
}
