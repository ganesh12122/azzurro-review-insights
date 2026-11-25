import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { OpsBriefResult } from "@/lib/ai/opsBrief";

export type CachedOpsBrief = OpsBriefResult & {
  day: string;
  scopeKey: string;
  at: string;
};

type CacheFile = Record<string, CachedOpsBrief>;

const globalStore = globalThis as unknown as {
  __azzurroOpsBriefCache?: Map<string, CachedOpsBrief>;
};

function memoryMap() {
  if (!globalStore.__azzurroOpsBriefCache) {
    globalStore.__azzurroOpsBriefCache = new Map();
  }
  return globalStore.__azzurroOpsBriefCache;
}

/** Calendar day in Australia/Sydney (YYYY-MM-DD). */
export function sydneyDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function cacheEntryKey(day: string, scopeKey: string) {
  return `${day}::${scopeKey}`;
}

function cachePaths() {
  // Prefer /tmp on serverless; fall back to src/data locally.
  return [
    path.join("/tmp", "azzurro-ops-brief-cache.json"),
    path.join(process.cwd(), "src", "data", "ops-brief-cache.json"),
  ];
}

function readDisk(): CacheFile {
  for (const file of cachePaths()) {
    try {
      if (!existsSync(/*turbopackIgnore: true*/ file)) continue;
      const raw = readFileSync(/*turbopackIgnore: true*/ file, "utf8");
      const parsed = JSON.parse(raw) as CacheFile;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* try next path */
    }
  }
  return {};
}

function writeDisk(data: CacheFile) {
  const payload = JSON.stringify(data, null, 2);
  for (const file of cachePaths()) {
    try {
      mkdirSync(/*turbopackIgnore: true*/ path.dirname(file), {
        recursive: true,
      });
      writeFileSync(/*turbopackIgnore: true*/ file, payload, "utf8");
      return;
    } catch {
      /* try next path (Vercel often allows /tmp only) */
    }
  }
}

export function getCachedOpsBrief(
  day: string,
  scopeKey: string,
): CachedOpsBrief | null {
  const key = cacheEntryKey(day, scopeKey);
  const mem = memoryMap().get(key);
  if (mem) return mem;

  const disk = readDisk()[key];
  if (!disk?.summary || !Array.isArray(disk.actions)) return null;
  if (disk.day !== day) return null;
  memoryMap().set(key, disk);
  return disk;
}

export function setCachedOpsBrief(
  day: string,
  scopeKey: string,
  brief: OpsBriefResult,
): CachedOpsBrief {
  const key = cacheEntryKey(day, scopeKey);
  const entry: CachedOpsBrief = {
    ...brief,
    day,
    scopeKey,
    at: new Date().toISOString(),
  };
  memoryMap().set(key, entry);
  const disk = readDisk();
  disk[key] = entry;
  // Drop entries older than ~3 Sydney days to keep file small
  for (const [k, v] of Object.entries(disk)) {
    if (v.day && v.day < dayMinus(day, 3)) delete disk[k];
  }
  writeDisk(disk);
  return entry;
}

function dayMinus(yyyyMmDd: string, days: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

export type FilterScope = {
  propertyId: string;
  from: string;
  to: string;
  sentiment: string;
  query: string;
};

/** Shared daily brief uses scope "default"; custom filters get their own day-scoped key. */
export function scopeKeyFromFilters(scope: FilterScope): {
  scopeKey: string;
  isDefault: boolean;
} {
  const isDefault =
    (scope.propertyId === "all" || !scope.propertyId) &&
    !scope.from &&
    !scope.to &&
    (scope.sentiment === "all" || !scope.sentiment) &&
    !scope.query.trim();

  if (isDefault) return { scopeKey: "default", isDefault: true };

  const scopeKey = [
    "custom",
    scope.propertyId || "all",
    scope.from || "-",
    scope.to || "-",
    scope.sentiment || "all",
    scope.query.trim().toLowerCase() || "-",
  ].join(":");

  return { scopeKey, isDefault: false };
}
