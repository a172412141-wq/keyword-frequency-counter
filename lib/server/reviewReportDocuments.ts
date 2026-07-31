import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  LevelFormat,
  LineRuleType,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { openSync as openFontSync } from "fontkit";
import PDFDocument from "pdfkit";
import type { ReviewAnalysis, ThemeSummary } from "./amazonReviewAnalyzer";

const CONTENT_WIDTH_DXA = 9360;
const TABLE_INDENT_DXA = 120;
const TABLE_CELL_MARGINS = {
  top: 80,
  bottom: 80,
  left: 120,
  right: 120,
};
const DOC_FONT_NAME = "Arial Unicode MS";
const DOC_FONT = {
  ascii: DOC_FONT_NAME,
  hAnsi: DOC_FONT_NAME,
  eastAsia: DOC_FONT_NAME,
  cs: DOC_FONT_NAME,
};
const COLORS = {
  ink: "202B33",
  muted: "5E6B75",
  blue: "2E74B5",
  darkBlue: "1F4D78",
  border: "D9E1E8",
  headerFill: "F2F4F7",
  calloutFill: "F4F6F9",
  white: "FFFFFF",
};
const PDF_CONTENT_WIDTH = 468;
const WINDOWS_FONT_ROOT = process.env.WINDIR
  ? join(process.env.WINDIR, "Fonts")
  : null;
type ReportFontCandidate = { path: string; postscriptName?: string };

const PDF_FONT_CANDIDATES: ReportFontCandidate[] = [
  { path: "/System/Library/Fonts/Supplemental/Arial Unicode.ttf" },
  { path: "/Library/Fonts/Arial Unicode.ttf" },
  ...(WINDOWS_FONT_ROOT
    ? [
        { path: join(WINDOWS_FONT_ROOT, "msyh.ttc"), postscriptName: "MicrosoftYaHei" },
        { path: join(WINDOWS_FONT_ROOT, "simsun.ttc"), postscriptName: "SimSun" },
        { path: join(WINDOWS_FONT_ROOT, "simhei.ttf") },
      ]
    : []),
  { path: "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf" },
  {
    path: "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    postscriptName: "NotoSansCJKsc-Regular",
  },
  {
    path: "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
    postscriptName: "WenQuanYiZenHei",
  },
];

type ReportTableRow = string[];

export async function buildReviewDocx(analysis: ReviewAnalysis): Promise<Buffer> {
  const sample = analysis.sample;
  const embeddedFont = buildEmbeddedDocxFont(analysis);
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      style: "ReportTitle",
      children: [new TextRun("AMAZON REVIEW ANALYSIS")],
    }),
    new Paragraph({
      style: "ReportSubtitle",
      children: [new TextRun(`${analysis.asin} 评论分析报告`)],
    }),
    metadataParagraph(
      "ASIN",
      `${analysis.asin}    采集模式：${modeLabel(analysis.mode)}`,
    ),
    metadataParagraph(
      "生成时间",
      `${formatDateTime(analysis.generatedAt)}    样本：${sample.total} 条书面评论`,
    ),
    new Paragraph({
      style: "MastheadRule",
      children: [new TextRun("")],
    }),
    heading("执行摘要", 1),
    bodyParagraph(executiveSummary(analysis)),
    calloutParagraph(sample.designNote),
    heading("样本概况", 1),
    reportTable(
      ["指标", "数值"],
      [
        ["总评论数", String(sample.total)],
        ["1 / 2 / 3 / 4 / 5 星样本", starCountLabel(analysis)],
        ["Verified Purchase", String(sample.verifiedCount)],
        ["Vine", String(sample.vineCount)],
        ["含图片 / 视频", `${sample.withImages} / ${sample.withVideo}`],
        ["日期范围", `${sample.earliestDate ?? "未知"} 至 ${sample.latestDate ?? "未知"}`],
        ["可用评论 ID", String(sample.usableReviewIdCount)],
      ],
      [2700, 6660],
    ),
    pageBreak(),
    heading("低星痛点", 1),
    themeTable(analysis.negativeThemes, sample.lowStarCount, "低星段占比"),
    pageBreak(),
    heading("高星价值点", 1),
    themeTable(analysis.positiveThemes, sample.highStarCount, "高星段占比"),
    pageBreak(),
    heading("三星信号", 1),
    themeTable(analysis.threeStarSignals, sample.threeStarCount, "三星段占比"),
    pageBreak(),
    heading("产品机会优先级", 1),
    ...opportunityParagraphs(analysis),
    heading("高频低星短语", 1),
    ...phraseParagraphs(analysis),
    heading("代表性评论", 1),
    ...exampleParagraphs(analysis),
    heading("采集状态", 1),
    ...warningParagraphs(analysis),
  ];

  const document = new Document({
    creator: "1SME Review Analysis",
    title: `${analysis.asin} 评论分析报告`,
    subject: "Amazon 评论主题分析、产品痛点与机会",
    description: "由 1SME 批量评论分析工具自动生成。",
    fonts: [{ name: DOC_FONT_NAME, data: embeddedFont }],
    styles: {
      default: {
        document: {
          run: {
            font: DOC_FONT,
            size: 22,
            color: COLORS.ink,
          },
          paragraph: {
            spacing: {
              before: 0,
              after: 120,
              line: 264,
              lineRule: LineRuleType.AUTO,
            },
          },
        },
      },
      paragraphStyles: [
        {
          id: "ReportTitle",
          name: "Report Title",
          basedOn: "Normal",
          next: "ReportSubtitle",
          quickFormat: true,
          run: {
            font: DOC_FONT,
            size: 46,
            bold: true,
            color: "000000",
          },
          paragraph: {
            spacing: { before: 0, after: 80 },
            keepNext: true,
          },
        },
        {
          id: "ReportSubtitle",
          name: "Report Subtitle",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            font: DOC_FONT,
            size: 28,
            color: "373737",
          },
          paragraph: {
            spacing: { before: 0, after: 240 },
            keepNext: true,
          },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            font: DOC_FONT,
            size: 32,
            bold: true,
            color: COLORS.blue,
          },
          paragraph: {
            spacing: { before: 320, after: 160 },
            keepNext: true,
            outlineLevel: 0,
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            font: DOC_FONT,
            size: 26,
            bold: true,
            color: COLORS.blue,
          },
          paragraph: {
            spacing: { before: 240, after: 120 },
            keepNext: true,
            outlineLevel: 1,
          },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            font: DOC_FONT,
            size: 24,
            bold: true,
            color: COLORS.darkBlue,
          },
          paragraph: {
            spacing: { before: 160, after: 80 },
            keepNext: true,
            outlineLevel: 2,
          },
        },
        {
          id: "TableText",
          name: "Table Text",
          basedOn: "Normal",
          run: {
            font: DOC_FONT,
            size: 19,
            color: COLORS.ink,
          },
          paragraph: {
            spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO },
          },
        },
        {
          id: "Metadata",
          name: "Metadata",
          basedOn: "Normal",
          run: {
            font: DOC_FONT,
            size: 21,
            color: COLORS.ink,
          },
          paragraph: {
            spacing: { before: 0, after: 40, line: 264, lineRule: LineRuleType.AUTO },
            keepNext: true,
          },
        },
        {
          id: "Callout",
          name: "Callout",
          basedOn: "Normal",
          run: {
            font: DOC_FONT,
            size: 20,
            color: COLORS.darkBlue,
          },
          paragraph: {
            shading: {
              type: ShadingType.CLEAR,
              fill: COLORS.calloutFill,
              color: "auto",
            },
            spacing: { before: 80, after: 160, line: 264, lineRule: LineRuleType.AUTO },
            indent: { left: 180, right: 180 },
          },
        },
        {
          id: "SmallMuted",
          name: "Small Muted",
          basedOn: "Normal",
          run: {
            font: DOC_FONT,
            size: 18,
            color: COLORS.muted,
          },
          paragraph: {
            spacing: { before: 0, after: 80, line: 240, lineRule: LineRuleType.AUTO },
          },
        },
        {
          id: "MastheadRule",
          name: "Masthead Rule",
          basedOn: "Normal",
          paragraph: {
            border: {
              bottom: {
                color: COLORS.blue,
                size: 12,
                style: BorderStyle.SINGLE,
                space: 6,
              },
            },
            spacing: { before: 80, after: 120 },
            keepNext: true,
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "opportunity-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                run: { font: DOC_FONT, bold: true, color: COLORS.darkBlue },
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                  spacing: { after: 160, line: 280, lineRule: LineRuleType.AUTO },
                  keepLines: true,
                },
              },
            },
          ],
        },
        {
          reference: "report-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                run: { font: DOC_FONT, color: COLORS.blue },
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                  spacing: { after: 160, line: 280, lineRule: LineRuleType.AUTO },
                  keepLines: true,
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
              header: 708,
              footer: 708,
              gutter: 0,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: {
                  bottom: {
                    color: COLORS.border,
                    size: 4,
                    style: BorderStyle.SINGLE,
                    space: 4,
                  },
                },
                children: [
                  new TextRun({
                    text: `1SME · ${analysis.asin} 评论分析`,
                    font: DOC_FONT,
                    size: 17,
                    color: COLORS.muted,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: ["第 ", PageNumber.CURRENT, " 页"],
                    font: DOC_FONT,
                    size: 17,
                    color: COLORS.muted,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

export async function buildReviewPdf(analysis: ReviewAnalysis): Promise<Buffer> {
  const font = findPdfFont();
  if (!font) {
    throw new Error("找不到支持中文的 PDF 字体，无法生成 PDF 报告。");
  }

  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({
      autoFirstPage: false,
      bufferPages: true,
      compress: true,
      size: "LETTER",
      margins: { top: 72, right: 72, bottom: 72, left: 72 },
      info: {
        Title: `${analysis.asin} 评论分析报告`,
        Author: "1SME Review Analysis",
        Subject: "Amazon 评论主题分析、产品痛点与机会",
      },
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    document.registerFont("Report", font.path, font.postscriptName);
    document.font("Report");
    document.addPage();

    addPdfTitle(document, analysis);
    addPdfHeading(document, "执行摘要", 1);
    addPdfBody(document, executiveSummary(analysis));
    addPdfCallout(document, analysis.sample.designNote);

    ensurePdfSpace(document, 280);
    addPdfHeading(document, "样本概况", 1);
    addPdfTable(
      document,
      ["指标", "数值"],
      [
        ["总评论数", String(analysis.sample.total)],
        ["1 / 2 / 3 / 4 / 5 星样本", starCountLabel(analysis)],
        ["Verified Purchase", String(analysis.sample.verifiedCount)],
        ["Vine", String(analysis.sample.vineCount)],
        ["含图片 / 视频", `${analysis.sample.withImages} / ${analysis.sample.withVideo}`],
        [
          "日期范围",
          `${analysis.sample.earliestDate ?? "未知"} 至 ${analysis.sample.latestDate ?? "未知"}`,
        ],
        ["可用评论 ID", String(analysis.sample.usableReviewIdCount)],
      ],
      [135, 333],
      font,
    );

    ensurePdfSpace(document, 560);
    addPdfHeading(document, "低星痛点", 1);
    addPdfThemeTable(
      document,
      analysis.negativeThemes,
      analysis.sample.lowStarCount,
      "低星段占比",
      font,
    );
    ensurePdfSpace(document, 560);
    addPdfHeading(document, "高星价值点", 1);
    addPdfThemeTable(
      document,
      analysis.positiveThemes,
      analysis.sample.highStarCount,
      "高星段占比",
      font,
    );
    ensurePdfSpace(document, 560);
    addPdfHeading(document, "三星信号", 1);
    addPdfThemeTable(
      document,
      analysis.threeStarSignals,
      analysis.sample.threeStarCount,
      "三星段占比",
      font,
    );

    addPdfHeading(document, "产品机会优先级", 1);
    if (analysis.negativeThemes.length === 0) {
      addPdfBody(document, "低星样本不足，暂未形成产品机会排序。");
    } else {
      analysis.negativeThemes.slice(0, 8).forEach((theme, index) => {
        addPdfListItem(
          document,
          `${index + 1}. ${theme.label}：${theme.count}/${analysis.sample.lowStarCount} 条低星评论涉及。${theme.action}`,
        );
      });
    }

    addPdfHeading(document, "高频低星短语", 1);
    if (analysis.frequentLowStarPhrases.length === 0) {
      addPdfBody(document, "低星文本不足，未生成高频短语。");
    } else {
      analysis.frequentLowStarPhrases.forEach((item) => {
        addPdfListItem(document, `• ${item.phrase}：${item.count} 条低星评论`);
      });
    }

    addPdfHeading(document, "代表性评论", 1);
    const themesWithExamples = analysis.negativeThemes
      .filter((theme) => theme.examples.length > 0)
      .slice(0, 5);
    if (themesWithExamples.length === 0) {
      addPdfBody(document, "当前低星样本中没有可展示的主题评论。");
    } else {
      themesWithExamples.forEach((theme) => {
        addPdfHeading(document, theme.label, 2);
        theme.examples.forEach((example) => {
          addPdfListItem(
            document,
            `• ${example.rating}★ · ${example.date ?? "日期未知"} · helpful ${example.helpfulVotes} · ${example.title || "无标题"}：${example.excerpt}`,
          );
        });
      });
    }

    addPdfHeading(document, "采集状态", 1);
    if (analysis.warnings.length === 0) {
      addPdfBody(document, "无部分窗口失败警告。");
    } else {
      analysis.warnings.forEach((warning) => addPdfListItem(document, `• ${warning}`));
    }
    const range = document.bufferedPageRange();
    for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
      document.switchToPage(pageIndex);
      addPdfPageFurniture(document, analysis.asin, pageIndex + 1, range.count);
    }
    document.end();
  });
}

function heading(text: string, level: 1 | 2 | 3) {
  return new Paragraph({
    style: `Heading${level}`,
    children: [new TextRun(text)],
  });
}

function bodyParagraph(text: string) {
  return new Paragraph({
    children: [new TextRun(text)],
  });
}

function metadataParagraph(label: string, value: string) {
  return new Paragraph({
    style: "Metadata",
    children: [
      new TextRun({ text: `${label}：`, bold: true, color: COLORS.ink }),
      new TextRun({ text: value, color: COLORS.ink }),
    ],
  });
}

function calloutParagraph(text: string) {
  return new Paragraph({
    style: "Callout",
    children: [new TextRun({ text: `数据口径：${text}` })],
  });
}

function pageBreak() {
  return new Paragraph({
    children: [new PageBreak()],
    spacing: { before: 0, after: 0 },
  });
}

function reportTable(headers: string[], rows: ReportTableRow[], widths: number[]) {
  const border = {
    color: COLORS.border,
    size: 4,
    style: BorderStyle.SINGLE,
  };
  const borders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };
  const createRow = (cells: string[], isHeader: boolean) =>
    new TableRow({
      tableHeader: isHeader,
      cantSplit: true,
      children: cells.map(
        (text, index) =>
          new TableCell({
            width: { size: widths[index], type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            shading: isHeader
              ? { type: ShadingType.CLEAR, fill: COLORS.headerFill, color: "auto" }
              : undefined,
            margins: TABLE_CELL_MARGINS,
            children: [
              new Paragraph({
                style: "TableText",
                alignment: index === 0 && widths[0] <= 900 ? AlignmentType.CENTER : AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text,
                    bold: isHeader,
                    color: isHeader ? COLORS.darkBlue : COLORS.ink,
                  }),
                ],
              }),
            ],
          }),
      ),
    });

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    indent: { size: TABLE_INDENT_DXA, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    columnWidths: widths,
    margins: TABLE_CELL_MARGINS,
    borders,
    rows: [createRow(headers, true), ...rows.map((row) => createRow(row, false))],
  });
}

function themeTable(themes: ThemeSummary[], denominator: number, shareLabel: string) {
  const rows =
    themes.length > 0
      ? themes.slice(0, 8).map((theme, index) => [
          String(index + 1),
          theme.label,
          `${theme.count}/${denominator}\n${formatPercent(theme.shareOfSegment)}`,
          theme.action,
        ])
      : [["-", "暂无稳定主题", "0\n0.0%", "增加样本后复核"]];
  return reportTable(["排名", "主题", shareLabel, "建议"], rows, [720, 2160, 1440, 5040]);
}

function opportunityParagraphs(analysis: ReviewAnalysis) {
  if (analysis.negativeThemes.length === 0) {
    return [bodyParagraph("低星样本不足，暂未形成产品机会排序。")];
  }
  return analysis.negativeThemes.slice(0, 8).map(
    (theme) =>
      new Paragraph({
        numbering: { reference: "opportunity-numbering", level: 0 },
        keepLines: true,
        children: [
          new TextRun({ text: `${theme.label}：`, bold: true, color: COLORS.darkBlue }),
          new TextRun(
            `${theme.count}/${analysis.sample.lowStarCount} 条低星评论涉及。${theme.action}`,
          ),
        ],
      }),
  );
}

function phraseParagraphs(analysis: ReviewAnalysis) {
  if (analysis.frequentLowStarPhrases.length === 0) {
    return [bodyParagraph("低星文本不足，未生成高频短语。")];
  }
  return analysis.frequentLowStarPhrases.map(
    (item) =>
      new Paragraph({
        numbering: { reference: "report-bullets", level: 0 },
        keepLines: true,
        children: [
          new TextRun({ text: item.phrase, bold: true }),
          new TextRun(`：${item.count} 条低星评论`),
        ],
      }),
  );
}

function exampleParagraphs(analysis: ReviewAnalysis) {
  const themes = analysis.negativeThemes
    .filter((theme) => theme.examples.length > 0)
    .slice(0, 5);
  if (themes.length === 0) {
    return [bodyParagraph("当前低星样本中没有可展示的主题评论。")];
  }
  return themes.flatMap((theme) => [
    heading(theme.label, 2),
    ...theme.examples.map(
      (example) =>
        new Paragraph({
          numbering: { reference: "report-bullets", level: 0 },
          keepLines: true,
          children: [
            new TextRun({
              text: `${example.rating}★ · ${example.date ?? "日期未知"} · helpful ${example.helpfulVotes} · `,
              color: COLORS.muted,
            }),
            new TextRun({ text: `${example.title || "无标题"}：`, bold: true }),
            new TextRun(example.excerpt),
          ],
        }),
    ),
  ]);
}

function warningParagraphs(analysis: ReviewAnalysis) {
  return analysis.warnings.length === 0
    ? [bodyParagraph("无部分窗口失败警告。")]
    : analysis.warnings.map(
        (warning) =>
          new Paragraph({
            numbering: { reference: "report-bullets", level: 0 },
            keepLines: true,
            children: [new TextRun(warning)],
          }),
      );
}

function addPdfTitle(document: PDFKit.PDFDocument, analysis: ReviewAnalysis) {
  document
    .font("Report")
    .fillColor("#000000")
    .fontSize(9)
    .text("AMAZON REVIEW ANALYSIS", { characterSpacing: 1.2 });
  document.moveDown(0.4);
  document.fontSize(22).text(`${analysis.asin} 评论分析报告`);
  document.moveDown(0.35);
  document
    .fillColor("#5E6B75")
    .fontSize(10)
    .text(
      `生成时间：${formatDateTime(analysis.generatedAt)}    采集模式：${modeLabel(analysis.mode)}    样本：${analysis.sample.total} 条`,
    );
  document.moveDown(0.8);
  document
    .strokeColor("#2E74B5")
    .lineWidth(1.5)
    .moveTo(72, document.y)
    .lineTo(72 + PDF_CONTENT_WIDTH, document.y)
    .stroke();
  document.moveDown(0.8);
}

function addPdfHeading(document: PDFKit.PDFDocument, text: string, level: 1 | 2) {
  const size = level === 1 ? 15 : 12;
  const topGap = level === 1 ? 22 : 14;
  ensurePdfSpace(document, size + topGap + 8);
  document.moveDown(level === 1 ? 0.8 : 0.45);
  document.font("Report").fontSize(size).fillColor(level === 1 ? "#2E74B5" : "#1F4D78");
  document.text(text, { lineGap: 2 });
  document.moveDown(0.35);
}

function addPdfBody(
  document: PDFKit.PDFDocument,
  text: string,
  color = "#202B33",
) {
  document.font("Report").fontSize(10.5).fillColor(color);
  document.text(text, { lineGap: 3, paragraphGap: 5 });
}

function addPdfCallout(document: PDFKit.PDFDocument, text: string) {
  document.font("Report").fontSize(9.5);
  const calloutText = `数据口径：${text}`;
  const height = document.heightOfString(calloutText, {
    width: PDF_CONTENT_WIDTH - 24,
    lineGap: 3,
  });
  ensurePdfSpace(document, height + 24);
  const y = document.y + 5;
  document
    .save()
    .fillColor("#F4F6F9")
    .roundedRect(72, y, PDF_CONTENT_WIDTH, height + 16, 4)
    .fill();
  document
    .fillColor("#1F4D78")
    .text(calloutText, 84, y + 8, {
      width: PDF_CONTENT_WIDTH - 24,
      lineGap: 3,
    });
  document.restore();
  document.x = 72;
  document.y = y + height + 24;
}

function addPdfTable(
  document: PDFKit.PDFDocument,
  headers: string[],
  rows: ReportTableRow[],
  widths: number[],
  font: ReportFontCandidate,
) {
  const headerCells = headers.map((header) => pdfCell(header, font, true));
  const bodyRows = rows.map((row) => row.map((cell) => pdfCell(cell, font, false)));
  document.table({
    columnStyles: widths.map((width) => ({ width })),
    defaultStyle: {
      border: 0.5,
      borderColor: "#D9E1E8",
      padding: [5, 6, 5, 6],
      textColor: "#202B33",
      align: { x: "left", y: "center" },
    },
    rowStyles: (row) =>
      row === 0
        ? {
            backgroundColor: "#F2F4F7",
            minHeight: 24,
          }
        : { minHeight: 22 },
    data: [headerCells, ...bodyRows],
  });
  document.font("Report").fontSize(10.5).fillColor("#202B33");
  document.moveDown(0.4);
}

function addPdfThemeTable(
  document: PDFKit.PDFDocument,
  themes: ThemeSummary[],
  denominator: number,
  shareLabel: string,
  font: ReportFontCandidate,
) {
  const rows =
    themes.length > 0
      ? themes.slice(0, 8).map((theme, index) => [
          String(index + 1),
          theme.label,
          `${theme.count}/${denominator}\n${formatPercent(theme.shareOfSegment)}`,
          theme.action,
        ])
      : [["-", "暂无稳定主题", "0\n0.0%", "增加样本后复核"]];
  addPdfTable(document, ["排名", "主题", shareLabel, "建议"], rows, [36, 108, 72, 252], font);
}

function pdfCell(
  text: string,
  font: ReportFontCandidate,
  header: boolean,
): PDFKit.Mixins.CellOptions {
  return {
    text,
    type: header ? "TH" : "TD",
    font: { src: font.path, family: font.postscriptName, size: header ? 9.2 : 8.8 },
    textColor: header ? "#1F4D78" : "#202B33",
    backgroundColor: header ? "#F2F4F7" : "#FFFFFF",
    padding: [5, 6, 5, 6],
    border: 0.5,
    borderColor: "#D9E1E8",
    align: { x: "left", y: "center" },
    textOptions: { lineGap: 2 },
  };
}

function addPdfListItem(document: PDFKit.PDFDocument, text: string) {
  document.font("Report").fontSize(10).fillColor("#202B33");
  const height = document.heightOfString(text, {
    width: PDF_CONTENT_WIDTH - 14,
    lineGap: 3,
  });
  ensurePdfSpace(document, height + 12);
  document.text(text, { indent: 14, paragraphGap: 5, lineGap: 3 });
}

function ensurePdfSpace(document: PDFKit.PDFDocument, requiredHeight: number) {
  const bottom = document.page.height - 72;
  if (document.y + requiredHeight > bottom) {
    document.addPage();
    document.font("Report");
  }
}

function addPdfPageFurniture(
  document: PDFKit.PDFDocument,
  asin: string,
  pageNumber: number,
  pageCount: number,
) {
  const currentX = document.x;
  const currentY = document.y;
  const originalBottomMargin = document.page.margins.bottom;
  document.page.margins.bottom = 0;
  document.font("Report").fontSize(8).fillColor("#6B7280");
  document
    .strokeColor("#D9E1E8")
    .lineWidth(0.5)
    .moveTo(72, document.page.height - 60)
    .lineTo(72 + PDF_CONTENT_WIDTH, document.page.height - 60)
    .stroke();
  document.text(`1SME · ${asin} 评论分析`, 72, document.page.height - 48, {
    width: PDF_CONTENT_WIDTH,
    align: "left",
    lineBreak: false,
  });
  document.text(`第 ${pageNumber} / ${pageCount} 页`, 72, document.page.height - 48, {
    width: PDF_CONTENT_WIDTH,
    align: "right",
    lineBreak: false,
  });
  document.page.margins.bottom = originalBottomMargin;
  document.x = currentX;
  document.y = currentY;
}

function executiveSummary(analysis: ReviewAnalysis) {
  const topNegative = analysis.negativeThemes.slice(0, 3);
  if (topNegative.length === 0) {
    return "低星样本不足，暂时无法形成稳定的痛点排序。建议切换到标准或最大化模式补充低星样本。";
  }
  return `低星评论最集中的方向是：${topNegative
    .map(
      (theme) =>
        `${theme.label}（${theme.count}/${analysis.sample.lowStarCount}，${formatPercent(theme.shareOfSegment)}）`,
    )
    .join("、")}。建议优先验证前三项问题对应的产品结构、质检与 Listing 预期管理。`;
}

function starCountLabel(analysis: ReviewAnalysis) {
  return [1, 2, 3, 4, 5]
    .map((star) => analysis.sample.starCounts[String(star)] ?? 0)
    .join(" / ");
}

function modeLabel(mode: ReviewAnalysis["mode"]) {
  if (mode === "basic") return "快速";
  if (mode === "full") return "标准";
  return "最大化";
}

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function findPdfFont() {
  return PDF_FONT_CANDIDATES.find((candidate) => existsSync(candidate.path)) ?? null;
}

function buildEmbeddedDocxFont(analysis: ReviewAnalysis) {
  const fontCandidate = findPdfFont();
  if (!fontCandidate) {
    throw new Error("找不到支持中文的字体，无法生成 Word 报告。");
  }
  const font = openFontSync(fontCandidate.path, fontCandidate.postscriptName);
  const subset = font.createSubset();
  const reportStaticText = `
    AMAZON REVIEW ANALYSIS
    评论分析报告 ASIN 生成时间 采集模式 样本状态 条书面评论
    执行摘要 数据口径 样本概况 指标 数值 总评论数 星样本
    Verified Purchase Vine 含图片 视频 日期范围 可用评论 ID
    低星痛点 高星价值点 三星信号 排名 主题 占比 建议
    产品机会优先级 高频低星短语 代表性评论 采集状态
    快速 标准 最大化 当前低星样本中没有可展示的主题评论
    低星样本不足 暂未形成产品机会排序 无部分窗口失败警告
    ★ · • ：，。；（）/0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
  `;
  const corpus = `${reportStaticText}\n${JSON.stringify(analysis)}`;
  for (const glyph of font.layout(corpus).glyphs) {
    subset.includeGlyph(glyph);
  }
  return Buffer.from(subset.encode());
}
