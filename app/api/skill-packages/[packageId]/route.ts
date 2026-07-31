import { NextResponse } from "next/server";
import {
  buildAllSkillArchive,
  buildSingleSkillArchive,
} from "@/lib/server/skillPackageArchive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ packageId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { packageId } = await context.params;
    const archive =
      packageId === "all"
        ? await buildAllSkillArchive()
        : await buildSingleSkillArchive(packageId);

    return new NextResponse(archive.data, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(archive.data.length),
        "Content-Disposition": contentDisposition(archive.fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "生成 Skill 下载包失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function contentDisposition(fileName: string) {
  const asciiName = fileName.replace(/[^\w.-]/g, "_");
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
