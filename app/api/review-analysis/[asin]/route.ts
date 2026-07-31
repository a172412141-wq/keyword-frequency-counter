import { NextResponse } from "next/server";
import { buildAmazonReviewPackage } from "@/lib/server/amazonReviewAnalyzer";
import type { ReviewMode } from "@/lib/reviewBatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ asin: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { asin } = await context.params;
    const mode = new URL(request.url).searchParams.get("mode") ?? "full";
    if (!isReviewMode(mode)) {
      return NextResponse.json({ error: "采集模式必须是 basic、full 或 max。" }, { status: 400 });
    }

    const archive = await buildAmazonReviewPackage(asin, mode);
    const starCounts = [1, 2, 3, 4, 5]
      .map((star) => `${star}:${archive.analysis.sample.starCounts[String(star)] ?? 0}`)
      .join(",");

    return new NextResponse(archive.data, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(archive.data.length),
        "Content-Disposition": contentDisposition(archive.fileName),
        "Cache-Control": "no-store",
        "X-Review-Count": String(archive.analysis.sample.total),
        "X-Warning-Count": String(archive.analysis.warnings.length),
        "X-Star-Counts": starCounts,
      },
    });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "评论分析包生成失败。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function isReviewMode(value: string): value is ReviewMode {
  return value === "basic" || value === "full" || value === "max";
}

function contentDisposition(fileName: string) {
  const asciiName = fileName.replace(/[^\w.-]/g, "_");
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
