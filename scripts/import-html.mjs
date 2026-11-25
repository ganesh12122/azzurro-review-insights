/**
 * Import reviews from manually saved Booking.com reviewlist HTML files.
 * Drop .html files into src/data/raw/ then run: npm run import:html
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW_DIR = path.join(ROOT, "src", "data", "raw");
const DATA_PATH = path.join(ROOT, "src", "data", "reviews.json");

const SLUG_TO_ID = {
  "olympic-paddington": "olympic-paddington",
  "venus-potts-point-sydney": "potts-point",
  "venus-surry-hills": "central-sydney",
  "chateau-de-venus": "darling-harbour",
};

const TOPIC_RULES = {
  cleanliness: [/\bclean/i, /\bdirty\b/i, /\bsmell/i],
  "check-in": [/\bcheck[-\s]?in\b/i, /\bdoor\s*code\b/i],
  staff: [/\bstaff\b/i, /\breceptionist\b/i, /\bfriendly\b/i],
  noise: [/\bnoise\b/i, /\bnoisy\b/i],
  facilities: [/\bfacilit/i, /\bkitchen\b/i, /\bwifi/i],
  location: [/\blocation\b/i, /\bcentral\b/i],
  "room-condition": [/\broom\b/i, /\bbed\b/i],
  value: [/\bvalue\b/i, /\bprice\b/i, /\bfree\s+dinner/i],
};

function classify(text) {
  return Object.entries(TOPIC_RULES)
    .filter(([, r]) => r.some((re) => re.test(text)))
    .map(([k]) => k);
}
function sentiment(score) {
  if (score >= 8) return "positive";
  if (score >= 6) return "neutral";
  return "negative";
}
function makeId(parts) {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

function parseFile(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(html);
  const slugMatch = html.match(/pagename=([a-z0-9-]+)/i);
  const slug = slugMatch?.[1];
  const propertyId = SLUG_TO_ID[slug];
  if (!propertyId) {
    console.warn("Skip (unknown property):", path.basename(filePath));
    return [];
  }

  const out = [];
  const scrapedAt = new Date().toISOString();
  $("[data-testid='review-card'], .review_list_new_item_block, .c-review-block, [data-review-url]").each((_, el) => {
    const card = $(el);
    const textOf = (...sels) => {
      for (const s of sels) {
        const t = card.find(s).first().text().replace(/\s+/g, " ").trim();
        if (t) return t;
      }
      return "";
    };
    const score = Number.parseFloat(textOf(".bui-review-score__badge", "[data-testid='review-score']").replace(",", ".")) || 0;
    const title = textOf(".c-review-block__title", "[data-testid='review-title']");
    const guestName = textOf(".bui-avatar-block__title") || "Guest";
    const guestCountry = textOf(".bui-avatar-block__subtitle");
    const dateRaw = textOf(".c-review-block__date", "[data-testid='review-date']");
    const pros = textOf("[data-testid='review-positive-text']", ".review_pos");
    const cons = textOf("[data-testid='review-negative-text']", ".review_neg");
    const bodies = card.find(".c-review__body").map((__, e) => $(e).text().replace(/\s+/g, " ").trim()).get();
    const text = [title, pros, cons, ...bodies].filter(Boolean).join(" ");
    if (!text && !score) return;
    const reviewDate = (dateRaw.match(/\d{4}-\d{2}-\d{2}/) || [scrapedAt.slice(0, 10)])[0];
    out.push({
      id: makeId([propertyId, guestName, reviewDate, title, String(score), text.slice(0, 80)]),
      propertyId,
      guestName,
      guestCountry,
      reviewDate,
      overallScore: score,
      title: title || "Guest review",
      pros,
      cons,
      text,
      topics: classify(text),
      sentiment: sentiment(score),
      scrapedAt,
      sourceUrl: `file://${path.basename(filePath)}`,
      collectionMethod: "html-import",
    });
  });
  return out;
}

const files = fs.existsSync(RAW_DIR)
  ? fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".html"))
  : [];
const collected = files.flatMap((f) => parseFile(path.join(RAW_DIR, f)));

let existing = [];
if (fs.existsSync(DATA_PATH)) {
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  existing = Array.isArray(raw) ? raw : raw.reviews || [];
}
const byId = new Map(existing.map((r) => [r.id, r]));
for (const r of collected) byId.set(r.id, r);
const merged = [...byId.values()].sort((a, b) => (a.reviewDate < b.reviewDate ? 1 : -1));
fs.writeFileSync(
  DATA_PATH,
  JSON.stringify({ updatedAt: new Date().toISOString(), count: merged.length, reviews: merged }, null, 2),
);
console.log(`Imported ${collected.length} from ${files.length} HTML files. Total unique: ${merged.length}`);
