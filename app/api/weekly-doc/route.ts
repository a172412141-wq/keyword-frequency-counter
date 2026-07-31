import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { diagnoseFangWeeklyDoc } from "@/lib/server/fangWeeklyDiagnostic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const LARK_CLI_FALLBACK = "/Users/1sme/.local/bin/lark-cli";
const MAX_BUFFER = 12 * 1024 * 1024;
const EXEC_TIMEOUT_MS = 120_000;

type JsonRecord = Record<string, unknown>;

type WeeklyRequest = {
  action?: string;
  doc?: string;
  topic?: string;
  meetingDate?: string;
  keyword?: string;
  searchQuery?: string;
  editedSince?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WeeklyRequest;
    if (body.action === "search") {
      return NextResponse.json(await searchDocs(body));
    }
    if (body.action === "fetch") {
      return NextResponse.json(await fetchDoc(body));
    }
    return NextResponse.json({ error: "未知操作。" }, { status: 400 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "周会文档工具执行失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function searchDocs(body: WeeklyRequest) {
  const args = [
    "drive",
    "+search",
    "--as",
    "user",
    "--query",
    stringValue(body.searchQuery),
    "--doc-types",
    "docx,wiki,doc",
    "--page-size",
    "10",
    "--sort",
    "edit_time",
    "--format",
    "json",
  ];

  const editedSince = stringValue(body.editedSince) || "30d";
  if (editedSince) {
    args.push("--edited-since", editedSince);
  }

  const { stdout, stderr } = await runLark(args);
  const parsed = parseJson(stdout);
  const data = dataRecord(parsed);
  const results = arrayValue(data.results).map((item) => normalizeSearchResult(asRecord(item)));

  return {
    ok: true,
    results,
    hasMore: Boolean(data.has_more),
    notice: stderr.trim() || undefined,
  };
}

async function fetchDoc(body: WeeklyRequest) {
  const doc = stringValue(body.doc);
  if (!doc) {
    throw new Error("请输入飞书文档 URL 或 token。");
  }

  const outlineArgs = [
    "docs",
    "+fetch",
    "--api-version",
    "v2",
    "--as",
    "user",
    "--doc",
    doc,
    "--format",
    "json",
    "--scope",
    "outline",
    "--max-depth",
    "3",
    "--detail",
    "with-ids",
    "--doc-format",
    "xml",
  ];
  const contentArgs = [
    "docs",
    "+fetch",
    "--api-version",
    "v2",
    "--as",
    "user",
    "--doc",
    doc,
    "--format",
    "json",
    "--scope",
    stringValue(body.keyword) ? "keyword" : "full",
    "--detail",
    "simple",
    "--doc-format",
    "markdown",
  ];

  const keyword = stringValue(body.keyword);
  if (keyword) {
    contentArgs.push("--keyword", keyword, "--context-before", "1", "--context-after", "1");
  }

  const outlineRun = await runLark(outlineArgs);
  const contentRun = await runLark(contentArgs);
  const outlineJson = parseJson(outlineRun.stdout);
  const contentJson = parseJson(contentRun.stdout);
  const outline = documentContent(outlineJson);
  const content = documentContent(contentJson);
  if (!content.trim()) {
    throw new Error("飞书文档内容为空，或当前用户无权读取正文。");
  }

  const document = documentRecord(contentJson);
  const title = stringValue(body.topic) || extractTitle(content, outline) || "Fang 周会";
  const meetingDate = normalizeDate(stringValue(body.meetingDate)) || normalizeDate(title) || normalizeDate(content.slice(0, 2000)) || todayString();
  const reading = analyzeWeeklyDoc(content);
  const diagnosis = diagnoseFangWeeklyDoc(content);
  const archivePath = archiveWeeklyDoc({
    doc,
    title,
    meetingDate,
    outline,
    content,
    reading,
    documentId: stringValue(document.document_id),
    revisionId: String(document.revision_id ?? ""),
    notice: [outlineRun.stderr, contentRun.stderr].filter(Boolean).join("\n").trim(),
  });

  return {
    ok: true,
    title,
    meetingDate,
    archivePath,
    documentId: stringValue(document.document_id),
    revisionId: String(document.revision_id ?? ""),
    outline: trimForPreview(outline, 6000),
    contentPreview: trimForPreview(content, 9000),
    reading,
    diagnosis,
    notice: [outlineRun.stderr, contentRun.stderr].filter(Boolean).join("\n").trim() || undefined,
  };
}

async function runLark(args: string[]) {
  const command = resolveLarkCli();
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: EXEC_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      env: {
        ...process.env,
        PATH: `${process.env.PATH ?? ""}:/Users/1sme/.local/bin`,
      },
    });
    return { stdout: String(stdout), stderr: String(stderr) };
  } catch (caughtError) {
    const error = caughtError as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
    if (error.code === "ENOENT") {
      throw new Error("未找到 lark-cli。请确认已安装并配置 LARK_CLI_PATH，或把 lark-cli 放在 ~/.local/bin。");
    }
    const stderr = stringValue(error.stderr);
    const stdout = stringValue(error.stdout);
    throw new Error(stderr || stdout || error.message || "lark-cli 执行失败。");
  }
}

function resolveLarkCli() {
  const configured = stringValue(process.env.LARK_CLI_PATH);
  if (configured) return configured;
  if (existsSync(LARK_CLI_FALLBACK)) return LARK_CLI_FALLBACK;
  return "lark-cli";
}

function parseJson(stdout: string) {
  try {
    return JSON.parse(stdout) as JsonRecord;
  } catch {
    throw new Error("lark-cli 返回内容不是有效 JSON。");
  }
}

function dataRecord(value: JsonRecord) {
  const data = asRecord(value.data);
  return Object.keys(data).length > 0 ? data : value;
}

function documentRecord(value: JsonRecord) {
  const data = dataRecord(value);
  const document = asRecord(data.document);
  return Object.keys(document).length > 0 ? document : data;
}

function documentContent(value: JsonRecord) {
  const document = documentRecord(value);
  return stringValue(document.content);
}

function normalizeSearchResult(item: JsonRecord) {
  const title = stripTags(
    stringValue(item.title) || stringValue(item.name) || stringValue(item.title_highlighted) || "未命名文档",
  );
  return {
    type: stringValue(item.type) || stringValue(item.doc_type),
    title,
    url: stringValue(item.url) || stringValue(item.docs_url) || stringValue(item.wiki_url),
    editTimeIso: stringValue(item.edit_time_iso),
    openTimeIso: stringValue(item.open_time_iso),
    createTimeIso: stringValue(item.create_time_iso),
  };
}

function analyzeWeeklyDoc(content: string) {
  const lines = unique(
    content
      .split(/\r?\n/)
      .map((line) => cleanLine(line))
      .filter((line) => line.length >= 4 && line.length <= 180),
  );
  const stageSignals = pickLines(lines, ["0-10", "10-30", "30-60", "60-100", "阶段", "验证期", "复制期", "矩阵"]);
  const kpiSignals = pickLines(lines, ["KPI", "GMV", "贡献毛利", "毛利", "利润", "退货", "断货", "库存", "周转", "现金流", "补货", "日均销量", "销量"]);
  const redLineSignals = pickLines(lines, ["红线", "负毛利", "亏损", "断货", "退货率", "周转", "现金", "库存", "不可扩", "停止", "暂停"]);
  const actionSignals = pickLines(lines, ["动作", "建议", "下周", "跟进", "优化", "补货", "扩品", "清理", "止损", "复盘", "负责人"]);
  const learningCandidates = pickLines(lines, ["规则", "原则", "必须", "不能", "不要", "判断", "标准", "以后", "复用", "沉淀", "红线"]);
  const meetingPoints = unique([...stageSignals, ...kpiSignals, ...actionSignals, ...lines]).slice(0, 7);
  const pendingReview = pickLines(lines, ["待确认", "不确定", "待复盘", "待复验", "再看", "观察"]);

  return {
    stageGuess: guessStage(content),
    meetingPoints,
    kpiSignals: kpiSignals.slice(0, 8),
    redLineSignals: redLineSignals.slice(0, 8),
    actionSignals: actionSignals.slice(0, 8),
    learningCandidates: learningCandidates.slice(0, 8),
    pendingReview: pendingReview.slice(0, 8),
  };
}

function guessStage(content: string) {
  const stages = ["0-10", "10-30", "30-60", "60-100"].filter((stage) => content.includes(stage));
  if (stages.length === 1) return stages[0];
  if (stages.length > 1) return `多阶段: ${stages.join(" / ")}`;
  return "未明确";
}

function pickLines(lines: string[], keywords: string[]) {
  return unique(lines.filter((line) => keywords.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase())))).slice(0, 10);
}

function archiveWeeklyDoc({
  doc,
  title,
  meetingDate,
  outline,
  content,
  reading,
  documentId,
  revisionId,
  notice,
}: {
  doc: string;
  title: string;
  meetingDate: string;
  outline: string;
  content: string;
  reading: ReturnType<typeof analyzeWeeklyDoc>;
  documentId: string;
  revisionId: string;
  notice: string;
}) {
  const archiveDir = join(process.cwd(), "skills", "fang-weekly-doc-reader", "weekly-meetings");
  mkdirSync(archiveDir, { recursive: true });
  const filename = `${meetingDate}-${safeSlug(title)}.md`;
  const archivePath = join(archiveDir, filename);
  const archive = [
    `# ${meetingDate} ${title}`,
    "",
    `- Source: ${doc}`,
    `- Fetched at: ${new Date().toISOString()}`,
    `- Document ID: ${documentId}`,
    `- Revision ID: ${revisionId}`,
    notice ? `- Notice: ${notice.replace(/\s+/g, " ")}` : "",
    "",
    "## 自动读取摘要",
    "",
    `- 阶段判断: ${reading.stageGuess}`,
    ...reading.meetingPoints.map((item) => `- ${item}`),
    "",
    "## 可沉淀规则候选",
    "",
    ...(reading.learningCandidates.length ? reading.learningCandidates.map((item) => `- ${item}`) : ["- "]),
    "",
    "## 待复验",
    "",
    ...(reading.pendingReview.length ? reading.pendingReview.map((item) => `- ${item}`) : ["- "]),
    "",
    "## Outline",
    "",
    fence(outline, "xml"),
    "",
    "## Raw Content",
    "",
    fence(content, "markdown"),
    "",
  ].filter(Boolean);
  writeFileSync(archivePath, archive.join("\n"), "utf8");
  return archivePath;
}

function extractTitle(...contents: string[]) {
  for (const content of contents) {
    const markdownTitle = content.match(/^#\s+(.+?)\s*$/m);
    if (markdownTitle?.[1]) return cleanLine(markdownTitle[1]);
    const xmlTitle = content.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    if (xmlTitle?.[1]) return cleanLine(stripTags(xmlTitle[1]));
    const heading = content.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/);
    if (heading?.[1]) return cleanLine(stripTags(heading[1]));
  }
  return "";
}

function normalizeDate(value: string) {
  const full = value.match(/(20\d{2})[-./年](\d{1,2})[-./月](\d{1,2})/);
  if (full) return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
  const partial = value.match(/(?<!\d)(\d{1,2})[-./月](\d{1,2})(?:日)?(?!\d)/);
  if (partial) return `${new Date().getFullYear()}-${partial[1].padStart(2, "0")}-${partial[2].padStart(2, "0")}`;
  return "";
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function trimForPreview(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}\n...` : value;
}

function cleanLine(value: string) {
  return stripTags(value)
    .replace(/^[-*#>\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

function safeSlug(value: string) {
  return (value.replace(/[^\w\u4e00-\u9fff]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "weekly-meeting").slice(0, 80);
}

function fence(value: string, language: string) {
  let ticks = "```";
  while (value.includes(ticks)) ticks += "`";
  return `${ticks}${language}\n${value.trim()}\n${ticks}`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
