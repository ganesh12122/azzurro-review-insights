import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import type { PropertyId, Review, TopicId } from "@/lib/types";
import { classifyTopics, sentimentFromScore } from "@/lib/topics";

const SLUG_TO_ID: Record<string, PropertyId> = {
  "olympic-paddington": "olympic-paddington",
  "venus-potts-point-sydney": "potts-point",
  "venus-surry-hills": "central-sydney",
  "chateau-de-venus": "darling-harbour",
};

const PROPERTY_IDS = new Set<PropertyId>([
  "olympic-paddington",
  "potts-point",
  "central-sydney",
  "darling-harbour",
]);

function dataPath(...parts: string[]) {
  return path.join(process.cwd(), "src", "data", ...parts);
}

function makeId(parts: string[]) {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

function parseFlexibleDate(raw: string): string | undefined {
  const cleaned = (raw || "").replace(/\s+/g, " ").trim();
  const months: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  const m1 = cleaned.match(
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
  );
  if (m1) {
    return `${m1[3]}-${months[m1[2].toLowerCase()]}-${m1[1].padStart(2, "0")}`;
  }
  const m2 = cleaned.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
  );
  if (m2) {
    return `${m2[3]}-${months[m2[1].toLowerCase()]}-${m2[2].padStart(2, "0")}`;
  }
  const iso = cleaned.match(/(\d{4}-\d{2}-\d{2})/);
  return iso?.[1];
}

type IncomingReview = {
  id?: string;
  propertyId: string;
  guestName?: string;
  guestCountry?: string;
  reviewDate?: string;
  stayDate?: string;
  overallScore?: number;
  title?: string;
  pros?: string;
  cons?: string;
  text?: string;
  topics?: TopicId[];
  sentiment?: Review["sentiment"];
  scrapedAt?: string;
  sourceUrl?: string;
};

function normalizeReview(input: IncomingReview): Review | null {
  if (!PROPERTY_IDS.has(input.propertyId as PropertyId)) return null;
  const propertyId = input.propertyId as PropertyId;
  const overallScore = Number(input.overallScore) || 0;
  const title = (input.title || "Guest review").trim();
  const pros = (input.pros || "").trim();
  const cons = (input.cons || "").trim();
  const text =
    (input.text || [title, pros, cons].filter(Boolean).join(" ")).replace(/\s+/g, " ").trim();
  if (!text && !overallScore) return null;

  const reviewDate =
    parseFlexibleDate(input.reviewDate || "") ||
    input.reviewDate ||
    new Date().toISOString().slice(0, 10);
  const guestName = (input.guestName || "Guest").trim();
  const guestCountry = (input.guestCountry || "").trim();
  const id =
    input.id ||
    makeId([
      propertyId,
      guestName,
      reviewDate,
      title,
      String(overallScore),
      text.slice(0, 120),
    ]);

  return {
    id,
    propertyId,
    guestName,
    guestCountry,
    reviewDate,
    stayDate: input.stayDate,
    overallScore,
    title,
    pros,
    cons,
    text,
    topics: (input.topics as TopicId[] | undefined)?.length
      ? (input.topics as TopicId[])
      : classifyTopics(text),
    sentiment: input.sentiment || sentimentFromScore(overallScore),
    scrapedAt: input.scrapedAt || new Date().toISOString(),
    sourceUrl: input.sourceUrl || "import://upload",
  };
}

export function parseReviewsJson(raw: string): Review[] {
  const data = JSON.parse(raw) as Review[] | { reviews?: Review[] };
  const list = Array.isArray(data) ? data : data.reviews || [];
  return list
    .map((r) => normalizeReview(r as IncomingReview))
    .filter((r): r is Review => Boolean(r));
}

/** Minimal CSV: header row required. */
export function parseReviewsCsv(raw: string): Review[] {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const out: Review[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const get = (name: string) => {
      const i = idx(name);
      return i >= 0 ? (cols[i] || "").trim() : "";
    };
    const propertyId = get("propertyid") || get("property_id") || get("property");
    const review = normalizeReview({
      propertyId,
      reviewDate: get("reviewdate") || get("review_date") || get("date"),
      overallScore: Number(get("overallscore") || get("score") || get("rating")) || 0,
      title: get("title"),
      pros: get("pros") || get("positive"),
      cons: get("cons") || get("negative"),
      text: get("text") || get("review"),
      guestName: get("guestname") || get("guest") || get("name"),
      guestCountry: get("guestcountry") || get("country"),
      sourceUrl: "import://csv",
    });
    if (review) out.push(review);
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

export function parseReviewsHtml(html: string, filename = "upload.html"): Review[] {
  const $ = cheerio.load(html);
  const slugMatch = html.match(/pagename=([a-z0-9-]+)/i);
  const slug = slugMatch?.[1];
  let propertyId = slug ? SLUG_TO_ID[slug] : undefined;

  // Allow filename hints: darling-harbour-offset-0.html
  if (!propertyId) {
    for (const id of PROPERTY_IDS) {
      if (filename.includes(id)) {
        propertyId = id;
        break;
      }
    }
  }
  if (!propertyId) return [];

  const scrapedAt = new Date().toISOString();
  const out: Review[] = [];

  $(
    "[data-testid='review-card'], .review_list_new_item_block, .c-review-block, [data-review-url]",
  ).each((_, el) => {
    const card = $(el);
    const textOf = (...sels: string[]) => {
      for (const s of sels) {
        const t = card.find(s).first().text().replace(/\s+/g, " ").trim();
        if (t) return t;
      }
      return "";
    };
    const score =
      Number.parseFloat(
        textOf(".bui-review-score__badge", "[data-testid='review-score']").replace(",", "."),
      ) || 0;
    const title = textOf(".c-review-block__title", "[data-testid='review-title']");
    const guestName = textOf(".bui-avatar-block__title") || "Guest";
    const guestCountry = textOf(".bui-avatar-block__subtitle");
    const dateRaw = textOf(".c-review-block__date", "[data-testid='review-date']");
    const pros = textOf("[data-testid='review-positive-text']", ".review_pos");
    const cons = textOf("[data-testid='review-negative-text']", ".review_neg");
    const bodies = card
      .find(".c-review__body")
      .map((__, e) => $(e).text().replace(/\s+/g, " ").trim())
      .get();
    const text = [title, pros, cons, ...bodies].filter(Boolean).join(" ");
    const review = normalizeReview({
      propertyId,
      guestName,
      guestCountry,
      reviewDate: parseFlexibleDate(dateRaw) || scrapedAt.slice(0, 10),
      overallScore: score,
      title,
      pros,
      cons,
      text,
      scrapedAt,
      sourceUrl: `import://html/${filename}`,
    });
    if (review) out.push(review);
  });

  return out;
}

export function mergeAndSaveReviews(
  incoming: Review[],
  meta: { trigger: string; sourceFiles?: string[] },
) {
  const reviewsFile = dataPath("reviews.json");
  const logFile = dataPath("sync-log.json");

  let existing: Review[] = [];
  let collectionNote: string | undefined;
  try {
    const raw = JSON.parse(fs.readFileSync(reviewsFile, "utf8"));
    existing = Array.isArray(raw) ? raw : raw.reviews || [];
    collectionNote = raw.collectionNote;
  } catch {
    existing = [];
  }

  const before = new Set(existing.map((r) => r.id));
  const byId = new Map(existing.map((r) => [r.id, r]));
  for (const r of incoming) byId.set(r.id, r);
  const merged = [...byId.values()].sort((a, b) =>
    a.reviewDate < b.reviewDate ? 1 : -1,
  );
  const newReviews = merged.filter((r) => !before.has(r.id)).length;
  const at = new Date().toISOString();

  const lastSync = {
    at,
    trigger: meta.trigger,
    status: incoming.length ? "ok" : "failed",
    properties: [...new Set(incoming.map((r) => r.propertyId))],
    collected: incoming.length,
    newReviews,
    mergedTotal: merged.length,
    errors: incoming.length
      ? []
      : ["No reviews parsed from upload. Check file type / property mapping."],
    note: incoming.length
      ? `Imported via ${meta.trigger}${meta.sourceFiles?.length ? ` (${meta.sourceFiles.join(", ")})` : ""}. Free reliable path when live scrape is WAF-blocked.`
      : "Import parsed 0 reviews. Dataset unchanged.",
    sourceFiles: meta.sourceFiles || [],
  };

  fs.writeFileSync(
    reviewsFile,
    JSON.stringify(
      {
        updatedAt: at,
        count: merged.length,
        lastSync,
        collectionNote:
          collectionNote ||
          "Primary reliable path: browser export / CSV-JSON-HTML upload. Live scrape is best-effort only.",
        reviews: merged,
      },
      null,
      2,
    ),
    "utf8",
  );

  let history: unknown[] = [];
  try {
    const log = JSON.parse(fs.readFileSync(logFile, "utf8"));
    history = Array.isArray(log.history) ? log.history : [];
  } catch {
    history = [];
  }
  history.unshift(lastSync);
  fs.writeFileSync(
    logFile,
    JSON.stringify({ updatedAt: at, history: history.slice(0, 30) }, null, 2),
    "utf8",
  );

  return lastSync;
}
