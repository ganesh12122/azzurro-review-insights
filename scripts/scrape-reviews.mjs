/**
 * Booking.com public review collector (ESM — avoids tsx/page.evaluate issues).
 *
 * Approach: Playwright Chromium → /reviewlist.html → Cheerio parse → merge JSON.
 * Dedupe by stable hash id. Retries + raw HTML dumps on failure.
 *
 * Usage: node scripts/scrape-reviews.mjs --pages=2
 */

import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "src", "data", "reviews.json");
const SYNC_LOG_PATH = path.join(ROOT, "src", "data", "sync-log.json");
const RAW_DIR = path.join(ROOT, "src", "data", "raw");

const PROPERTIES = [
  {
    id: "olympic-paddington",
    name: "Olympic Hotel Paddington",
    bookingSlug: "olympic-paddington",
  },
  {
    id: "potts-point",
    name: "Azzurro Pod Hotel Potts Point",
    bookingSlug: "venus-potts-point-sydney",
  },
  {
    id: "central-sydney",
    name: "Azzurro Pod Hotel Central Sydney",
    bookingSlug: "venus-surry-hills",
  },
  {
    id: "darling-harbour",
    name: "Azzurro Pod Hotel Darling Harbour",
    bookingSlug: "chateau-de-venus",
  },
];

const TOPIC_RULES = {
  cleanliness: [/\bclean(?:liness|ing|ed|er)?\b/i, /\bdirty\b/i, /\bsmell/i, /\bmould|\bmold/i],
  "check-in": [/\bcheck[-\s]?in\b/i, /\bdoor\s*code\b/i, /\breception\b/i],
  staff: [/\bstaff\b/i, /\breceptionist\b/i, /\bfriendly\b/i, /\bhelpful\b/i, /\brude\b/i],
  noise: [/\bnoise\b/i, /\bnoisy\b/i, /\bloud\b/i],
  facilities: [/\bfacilit/i, /\bkitchen\b/i, /\bwifi|\bwi-fi/i, /\blift|\belevator/i, /\bshower\b/i],
  location: [/\blocation\b/i, /\bcentral\b/i, /\bstation\b/i, /\bnear/i],
  "room-condition": [/\broom\b/i, /\bbed\b/i, /\bpod\b/i, /\bbroken\b/i],
  value: [/\bvalue\b/i, /\bprice\b/i, /\bworth\b/i, /\bfree\s+(?:dinner|breakfast)/i],
};

function classifyTopics(text) {
  return Object.entries(TOPIC_RULES)
    .filter(([, rules]) => rules.some((re) => re.test(text)))
    .map(([k]) => k);
}

function sentimentFromScore(score) {
  if (score >= 8) return "positive";
  if (score >= 6) return "neutral";
  return "negative";
}

function makeId(parts) {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

function parseFlexibleDate(raw) {
  const cleaned = (raw || "").replace(/\s+/g, " ").trim();
  const months = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  };
  const m1 = cleaned.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (m1) return `${m1[3]}-${months[m1[2].toLowerCase()]}-${m1[1].padStart(2, "0")}`;
  const m2 = cleaned.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m2) return `${m2[3]}-${months[m2[1].toLowerCase()]}-${m2[2].padStart(2, "0")}`;
  const iso = cleaned.match(/(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : undefined;
}

function reviewListUrl(slug, offset) {
  const params = new URLSearchParams({
    cc1: "au",
    pagename: slug,
    type: "total",
    sort: "f_recent_desc",
    rows: "25",
    offset: String(offset),
    lang: "en-us",
  });
  return `https://www.booking.com/reviewlist.html?${params}`;
}

function parseReviewsFromHtml(html, property, sourceUrl) {
  const $ = cheerio.load(html);
  const cards = $(
    "[data-testid='review-card'], .review_list_new_item_block, .c-review-block, li[data-review-url], div[data-review-url], [itemprop='review']",
  );

  const scrapedAt = new Date().toISOString();
  const out = [];

  cards.each((_, el) => {
    const card = $(el);
    const textOf = (...sels) => {
      for (const s of sels) {
        const t = card.find(s).first().text().replace(/\s+/g, " ").trim();
        if (t) return t;
      }
      return "";
    };

    const scoreRaw = textOf(
      "[data-testid='review-score']",
      ".bui-review-score__badge",
      ".review-score-badge",
      "[aria-label*='Scored']",
    );
    const score = Number.parseFloat(scoreRaw.replace(",", ".")) || 0;
    const title = textOf("[data-testid='review-title']", ".c-review-block__title", "h3", "h4");
    const dateRaw = textOf("[data-testid='review-date']", ".c-review-block__date", ".review-date");
    const guestName = textOf("[data-testid='reviewer-name']", ".bui-avatar-block__title") || "Guest";
    const guestCountry = textOf("[data-testid='reviewer-country']", ".bui-avatar-block__subtitle");
    const pros = textOf("[data-testid='review-positive-text']", ".review_pos", ".c-review__body");
    const cons = textOf("[data-testid='review-negative-text']", ".review_neg");
    const bodies = card
      .find(".c-review__body, [data-testid='review-content']")
      .map((__, e) => $(e).text().replace(/\s+/g, " ").trim())
      .get();
    const text = [title, pros, cons, ...bodies].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (!text && !score) return;

    const reviewDate = parseFlexibleDate(dateRaw) || scrapedAt.slice(0, 10);
    const reviewUrl = card.attr("data-review-url") || "";
    const id = makeId([property.id, reviewUrl, guestName, reviewDate, title, String(score), text.slice(0, 120)]);

    out.push({
      id,
      propertyId: property.id,
      guestName,
      guestCountry,
      reviewDate,
      overallScore: score,
      title: title || "Guest review",
      pros,
      cons,
      text,
      topics: classifyTopics(text),
      sentiment: sentimentFromScore(score),
      scrapedAt,
      sourceUrl,
    });
  });

  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dismissCookies(page) {
  for (const sel of ["#onetrust-accept-btn-handler", "button:has-text('Accept all')", "button:has-text('Accept')"]) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1200 })) {
        await btn.click({ timeout: 2000 });
        return;
      }
    } catch {
      /* ignore */
    }
  }
}

function loadExisting() {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    return Array.isArray(raw) ? raw : raw.reviews || [];
  } catch {
    return [];
  }
}

function appendSyncLog(entry) {
  let history = [];
  if (fs.existsSync(SYNC_LOG_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(SYNC_LOG_PATH, "utf8"));
      history = Array.isArray(raw.history) ? raw.history : [];
    } catch {
      history = [];
    }
  }
  history.unshift(entry);
  history = history.slice(0, 30);
  fs.writeFileSync(
    SYNC_LOG_PATH,
    JSON.stringify({ updatedAt: entry.at, history }, null, 2),
    "utf8",
  );
}

function saveReviews(reviews, syncMeta) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  const existingNote = (() => {
    try {
      const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
      return raw.collectionNote || undefined;
    } catch {
      return undefined;
    }
  })();

  fs.writeFileSync(
    DATA_PATH,
    JSON.stringify(
      {
        updatedAt: syncMeta.at,
        count: reviews.length,
        lastSync: syncMeta,
        collectionNote: existingNote,
        reviews,
      },
      null,
      2,
    ),
    "utf8",
  );
  appendSyncLog(syncMeta);
}

async function main() {
  const pages = Number(process.argv.find((a) => a.startsWith("--pages="))?.split("=")[1] || 2);
  const propertyFilter = process.argv.find((a) => a.startsWith("--property="))?.split("=")[1];
  const targets = PROPERTIES.filter((p) => (propertyFilter ? p.id === propertyFilter : true));

  console.log(`Scraping ${targets.length} properties × ${pages} page(s)...`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-AU",
    viewport: { width: 1400, height: 900 },
    extraHTTPHeaders: {
      "Accept-Language": "en-AU,en;q=0.9",
    },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await context.newPage();

  const collected = [];
  const errors = [];

  for (const property of targets) {
    console.log(`\n→ ${property.name}`);
    // Warm up on hotel page first (sometimes reduces challenge rate)
    try {
      await page.goto(`https://www.booking.com/hotel/au/${property.bookingSlug}.html`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await dismissCookies(page);
      await sleep(1500);
    } catch (err) {
      console.warn("  hotel warm-up failed:", err.message);
    }

    for (let i = 0; i < pages; i++) {
      const offset = i * 25;
      const url = reviewListUrl(property.bookingSlug, offset);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await dismissCookies(page);
        await sleep(2500);
        const html = await page.content();
        fs.mkdirSync(RAW_DIR, { recursive: true });
        fs.writeFileSync(path.join(RAW_DIR, `${property.id}-offset-${offset}.html`), html);

        const batch = parseReviewsFromHtml(html, property, url);
        console.log(`  offset ${offset}: ${batch.length} reviews (html ${html.length} bytes)`);
        if (/challenge|captcha|cf-browser/i.test(html) && batch.length === 0) {
          errors.push(`${property.id}@${offset}: challenge/WAF page (0 reviews parsed)`);
        }
        collected.push(...batch);
        if (batch.length === 0 && i > 0) break;
        await sleep(1500 + Math.random() * 1000);
      } catch (err) {
        console.error(`  FAILED offset ${offset}:`, err.message);
        errors.push(`${property.id}@${offset}: ${err.message}`);
      }
    }
  }

  await browser.close();

  const beforeIds = new Set(loadExisting().map((r) => r.id));
  const byId = new Map();
  for (const r of loadExisting()) byId.set(r.id, r);
  for (const r of collected) byId.set(r.id, r);
  const merged = [...byId.values()].sort((a, b) => (a.reviewDate < b.reviewDate ? 1 : -1));
  const newCount = merged.filter((r) => !beforeIds.has(r.id)).length;

  const trigger =
    process.env.SYNC_TRIGGER ||
    (process.argv.includes("--scheduled") ? "scheduled" : "manual");

  const wafBlocked =
    collected.length === 0 &&
    errors.some((e) => /waf|challenge/i.test(e));

  const syncMeta = {
    at: new Date().toISOString(),
    trigger,
    status:
      wafBlocked
        ? "blocked"
        : errors.length && collected.length === 0
          ? "failed"
          : errors.length
            ? "partial"
            : "ok",
    properties: targets.map((t) => t.id),
    pagesPerProperty: pages,
    collected: collected.length,
    newReviews: newCount,
    mergedTotal: merged.length,
    errors,
    note: wafBlocked
      ? "Booking.com blocked this scrape (WAF/challenge). Your existing dataset is unchanged — dashboard still works. Retry later, use HTML import, or rely on the daily job."
      : collected.length === 0 && errors.length
        ? "No reviews parsed. Existing dataset kept; do not treat as all-clear."
        : undefined,
  };

  // Always persist merge result + sync status (even if 0 new) so ops can see the attempt.
  saveReviews(merged, syncMeta);

  console.log(`\nSaved ${merged.length} unique reviews → ${DATA_PATH}`);
  console.log(`Collected this run: ${collected.length} (new ids: ${newCount})`);
  console.log(`Sync status: ${syncMeta.status}`);
  if (errors.length) {
    console.log("Notes/errors:");
    errors.forEach((e) => console.log(" -", e));
  }

  // Non-zero exit on hard failure helps CI/cron alert — but keep dataset intact.
  // WAF "blocked" is expected in some environments; exit 0 so scheduled jobs still commit sync-log.
  if (syncMeta.status === "failed") process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
