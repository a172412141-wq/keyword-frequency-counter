import { describe, expect, it } from "vitest";
import { buildSingleSkillArchive } from "./skillPackageArchive";

function readStoredZipEntries(data: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = 0;

  while (offset + 30 <= data.length && data.readUInt32LE(offset) === 0x04034b50) {
    const compressionMethod = data.readUInt16LE(offset + 8);
    const compressedSize = data.readUInt32LE(offset + 18);
    const nameLength = data.readUInt16LE(offset + 26);
    const extraLength = data.readUInt16LE(offset + 28);
    expect(compressionMethod).toBe(0);

    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = data.subarray(nameStart, nameStart + nameLength).toString("utf8");
    entries.set(name, data.subarray(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }

  return entries;
}

describe("skill package archives", () => {
  it.each([
    ["amazon-review-analyzer", "pnpm dev"],
    ["bulk-ad-diagnostic-generator", "uvicorn api:app"],
    ["amazon-title-optimizer", "Start-Process"],
    ["fang-business-analysis", "streamlit run"],
    ["keyword-frequency-counter", "pnpm dev"],
    ["fang-business-diagnostic-model", "fang-business-diagnostic"],
  ])("includes native Windows scripts for %s", async (packageId, runMarker) => {
    const archive = await buildSingleSkillArchive(packageId);
    const entries = readStoredZipEntries(archive.data);
    const skillFolder =
      packageId === "fang-business-diagnostic-model"
        ? "fang-business-diagnostic"
        : packageId;

    expect(archive.fileName).toBe(`${skillFolder}-one-click.zip`);
    expect(entries.has("双击安装到Codex.command")).toBe(true);
    expect(entries.has("双击安装到Codex-Windows.cmd")).toBe(true);
    expect(entries.has(`skills/${skillFolder}/scripts/install.sh`)).toBe(true);
    expect(entries.has(`skills/${skillFolder}/scripts/install.ps1`)).toBe(true);
    expect(entries.has(`skills/${skillFolder}/scripts/verify.ps1`)).toBe(true);

    const runScript = entries.get(`skills/${skillFolder}/scripts/run.ps1`);
    expect(runScript?.toString("utf8")).toContain(runMarker);
  });

  it("packages the Amazon review analyzer source, report dependencies, and canonical Skill metadata", async () => {
    const archive = await buildSingleSkillArchive("amazon-review-analyzer");
    const entries = readStoredZipEntries(archive.data);
    const root = "skills/amazon-review-analyzer";

    expect(entries.has(`${root}/assets/source/app/api/review-analysis/[asin]/route.ts`)).toBe(true);
    expect(entries.has(`${root}/assets/source/lib/server/reviewReportDocuments.ts`)).toBe(true);
    expect(entries.has(`${root}/scripts/run.sh`)).toBe(true);
    expect(entries.get(`${root}/scripts/run.sh`)?.toString("utf8")).toContain("PORT:-3011");

    const packageJson = JSON.parse(
      entries.get(`${root}/assets/source/package.json`)?.toString("utf8") ?? "{}",
    ) as { dependencies?: Record<string, string> };
    expect(packageJson.dependencies).toMatchObject({
      docx: "^9.7.1",
      fontkit: "^2.0.4",
      pdfkit: "^0.19.1",
    });

    const skill = entries.get(`${root}/SKILL.md`)?.toString("utf8") ?? "";
    expect(skill).toContain("name: amazon-review-analyzer");
    expect(skill).toContain("中文 PDF、可编辑 Word");
  });
});
