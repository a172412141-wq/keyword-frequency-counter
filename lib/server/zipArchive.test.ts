import { describe, expect, it } from "vitest";
import { buildStoredZip } from "./zipArchive";

describe("buildStoredZip", () => {
  it("creates readable stored ZIP entries", () => {
    const archive = buildStoredZip([
      { path: "sample/README.md", data: "# Hello" },
      { path: "sample/data.json", data: '{"ok":true}' },
    ]);
    const entries = readStoredZipEntries(archive);

    expect(entries.get("sample/README.md")?.toString("utf8")).toBe("# Hello");
    expect(entries.get("sample/data.json")?.toString("utf8")).toBe('{"ok":true}');
  });

  it("rejects traversal paths", () => {
    expect(() => buildStoredZip([{ path: "../secret.txt", data: "no" }])).toThrow(
      "Unsafe ZIP path",
    );
  });
});

function readStoredZipEntries(data: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = 0;

  while (offset + 30 <= data.length && data.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = data.readUInt32LE(offset + 18);
    const nameLength = data.readUInt16LE(offset + 26);
    const extraLength = data.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = data.subarray(nameStart, nameStart + nameLength).toString("utf8");
    entries.set(name, data.subarray(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }

  return entries;
}
