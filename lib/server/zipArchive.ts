import { constants } from "node:buffer";

export type ArchiveEntry = {
  path: string;
  data: Buffer | string;
  mode?: number;
};

type NormalizedArchiveEntry = {
  path: string;
  data: Buffer;
  mode: number;
};

export function buildStoredZip(entries: ArchiveEntry[]) {
  const normalizedEntries = entries.map<NormalizedArchiveEntry>((entry) => ({
    path: normalizeZipPath(entry.path),
    data: Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8"),
    mode: entry.mode ?? 0o100644,
  }));
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const { dosDate, dosTime } = getDosDateTime(new Date());

  for (const entry of normalizedEntries) {
    const name = Buffer.from(entry.path, "utf8");
    const data = entry.data;
    if (!entry.path || name.length > 0xffff) {
      throw new Error(`Invalid ZIP path: ${entry.path}`);
    }
    if (data.length > constants.MAX_LENGTH) {
      throw new Error(`ZIP entry is too large: ${entry.path}`);
    }

    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x031e, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(((entry.mode & 0xffff) << 16) >>> 0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(normalizedEntries.length, 8);
  endRecord.writeUInt16LE(normalizedEntries.length, 10);
  endRecord.writeUInt32LE(centralSize, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, endRecord]);
}

function normalizeZipPath(value: string) {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (normalized.split("/").some((part) => part === "..")) {
    throw new Error(`Unsafe ZIP path: ${value}`);
  }
  return normalized;
}

function getDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
