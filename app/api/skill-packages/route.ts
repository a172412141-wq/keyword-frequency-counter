import { NextResponse } from "next/server";
import { listToolSkillPackageSummaries } from "@/lib/server/skillPackageArchive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const packages = await listToolSkillPackageSummaries();
    return NextResponse.json({ packages });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "读取 Skill 封装清单失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
