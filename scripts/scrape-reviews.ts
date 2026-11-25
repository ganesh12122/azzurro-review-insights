/**
 * Booking.com public review collector (no official API).
 *
 * Approach:
 * - Uses Playwright (real Chromium) because plain HTTP hits WAF/challenges.
 * - Loads /reviewlist.html?pagename=<slug>&cc1=au&rows=25&offset=N
 * - Parses review cards from the rendered DOM.
 * - Merges into data/reviews.json with id-based dedupe (keeps newest scrape).
 * - Retries transient failures; continues other properties if one fails.
 *
 * Limitations: Booking markup/WAF can change; respect rate limits; public pages only.
 *
 * Usage:
 *   npx tsx scripts/scrape-reviews.ts
 *   npx tsx scripts/scrape-reviews.ts --pages=3
 *   npx tsx scripts/scrape-reviews.ts --property=darling-harbour
 */

import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { chromium, type Page } from "playwright";

type PropertyId =
  | "olympic-paddington"
  | "potts-point"
  | "central-sydney"
  | "darling-harbour";

type TopicId =
  | "cleanliness"
  | "check-in"
  | "staff"
  | "noise"
  | "facilities"
  | "location"
  | "room-condition"
  | "value";

interface PropertyConfig {
  id: PropertyId;
  name: string;
  bookingSlug: string;
  bookingUrl: string;
}

interface ScrapedReview {
  id: string;
  propertyId: PropertyId;
  guestName: string;
  guestCountry: string;
  reviewDate: string;
  stayDate?: string;
  overallScore: number;
  title: string;
  pros: string;
  cons: string;
  text: string;
  topics: TopicId[];
  sentiment: "positive" | "neutral" | "negative";
  scrapedAt: string;
  sourceUrl: string;
}

const PROPERTIES: PropertyConfig[] = [
  {
    id: "olympic-paddington",
    name: "Olympic Hotel Paddington",
    bookingSlug: "olympic-paddington",
    bookingUrl: "https://www.booking.com/hotel/au/olympic-paddington.html",
  },
  {
    id: "potts-point",
    name: "Azzurro Pod Hotel Potts Point",
    bookingSlug: "venus-potts-point-sydney",
    bookingUrl: "https://www.booking.com/hotel/au/venus-potts-point-sydney.html",
  },
  {
    id: "central-sydney",
    name: "Azzurro Pod Hotel Central Sydney",
    bookingSlug: "venus-surry-hills",
    bookingUrl: "https://www.booking.com/hotel/au/venus-surry-hills.html",
  },
  {
    id: "darling-harbour",
    name: "Azzurro Pod Hotel Darling Harbour",
    bookingSlug: "chateau-de-venus",
    bookingUrl: "https://www.booking.com/hotel/au/chateau-de-venus.html",
  },
];

const TOPIC_RULES: Record<TopicId, RegExp[]> = {
  cleanliness: [
    /\bclean(?:liness|ing|ed|er)?\b/i,
    /\bdirty\b/i,
    /\bdust(?:y)?\b/i,
    /\bstain(?:s|ed)?\b/i,
    /\bmould\b|\bmold\b/i,
    /\bsmell(?:s|ed|y)?\b/i,
    /\bhygiene\b/i,
  ],
  "check-in": [
    /\bcheck[-\s]?in\b/i,
    /\bdoor\s*code\b/i,
    /\baccess\s*code\b/i,
    /\breception\b/i,
  ],
  staff: [
    /\bstaff\b/i,
    /\breceptionist\b/i,
    /\bfriendly\b/i,
    /\bhelpful\b/i,
    /\brude\b/i,
  ],
  noise: [/\bnoise\b/i, /\bnoisy\b/i, /\bloud\b/i, /\bhallway\b/i],
  facilities: [
    /\bfacilit(?:y|ies)\b/i,
    /\bkitchen\b/i,
    /\bwifi\b|\bwi-fi\b/i,
    /\blaundry\b/i,
    /\belevator\b|\blift\b/i,
    /\bshower\b/i,
  ],
  location: [
    /\blocation\b/i,
    /\bcentral\b/i,
    /\bnear(?:by)?\b/i,
    /\bstation\b/i,
  ],
  "room-condition": [
    /\broom\b/i,
    /\bbed(?:ding)?\b/i,
    /\bpod\b/i,
    /\bbroken\b/i,
    /\brundown\b/i,
  ],
  value: [
    /\bvalue\b/i,
    /\bprice\b/i,
    /\bworth\b/i,
    /\bbudget\b/i,
    /\bfree\s+(?:dinner|breakfast|meal)\b/i,
  ],
};

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "src", "data", "reviews.json");
const RAW_DIR = path.join(ROOT, "src", "data", "raw");

function classifyTopics(text: string): TopicId[] {
  return (Object.keys(TOPIC_RULES) as TopicId[]).filter((topic) =>
    TOPIC_RULES[topic].some((re) => re.test(text)),
  );
}

function sentimentFromScore(score: number) {
  if (score >= 8) return "positive" as const;
  if (score >= 6) return "neutral" as const;
  return "negative" as const;
}

function parseArgs() {
  const pages =
    Number(
      process.argv.find((a) => a.startsWith("--pages="))?.split("=")[1],
    ) || 2;
  const propertyFilter = process.argv
    .find((a) => a.startsWith("--property="))
    ?.split("=")[1] as PropertyId | undefined;
  return { pages, propertyFilter };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function reviewListUrl(slug: string, offset: number) {
  const params = new URLSearchParams({
    cc1: "au",
    pagename: slug,
    type: "total",
    sort: "f_recent_desc",
    rows: "25",
    offset: String(offset),
    lang: "en-us",
  });
  return `https://www.booking.com/reviewlist.html?${params.toString()}`;
}

function makeId(parts: string[]) {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

function parseFlexibleDate(raw: string): string | undefined {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;

  // "Reviewed: 12 November 2025" / "November 12, 2025"
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
    const day = m1[1].padStart(2, "0");
    const month = months[m1[2].toLowerCase()];
    return `${m1[3]}-${month}-${day}`;
  }

  const m2 = cleaned.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
  );
  if (m2) {
    const month = months[m2[1].toLowerCase()];
    const day = m2[2].padStart(2, "0");
    return `${m2[3]}-${month}-${day}`;
  }

  const iso = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];

  return undefined;
}

async function dismissCookies(page: Page) {
  const candidates = [
    "#onetrust-accept-btn-handler",
    "button:has-text('Accept')",
    "button:has-text('I Agree')",
    "button:has-text('Accept all')",
  ];
  for (const sel of candidates) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click({ timeout: 2000 });
        return;
      }
    } catch {
      /* ignore */
    }
  }
}

async function scrapePage(
  page: Page,
  property: PropertyConfig,
  offset: number,
): Promise<ScrapedReview[]> {
  const url = reviewListUrl(property.bookingSlug, offset);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await dismissCookies(page);
      await page.waitForTimeout(1500);

      // Wait for either review cards or an empty state.
      await Promise.race([
        page
          .locator(
            "[data-testid='review-card'], .review_list_new_item_block, .c-review-block, [data-review-url]",
          )
          .first()
          .waitFor({ timeout: 20000 }),
        page.waitForTimeout(8000),
      ]);

      const html = await page.content();
      fs.mkdirSync(RAW_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(
          RAW_DIR,
          `${property.id}-offset-${offset}-attempt-${attempt}.html`,
        ),
        html,
        "utf8",
      );

      const parsed = await page.evaluate(() => {
        const pick = (...sels: string[]) => {
          for (const s of sels) {
            const el = document.querySelector(s);
            if (el) return el;
          }
          return null;
        };

        const cards = Array.from(
          document.querySelectorAll(
            "[data-testid='review-card'], .review_list_new_item_block, .c-review-block, li[data-review-url], div[data-review-url]",
          ),
        );

        return cards.map((card) => {
          const textOf = (root: Element, ...sels: string[]) => {
            for (const s of sels) {
              const el = root.querySelector(s);
              if (el?.textContent?.trim()) return el.textContent.trim();
            }
            return "";
          };

          const scoreRaw = textOf(
            card,
            "[data-testid='review-score']",
            ".bui-review-score__badge",
            ".review-score-badge",
          );
          const score = Number.parseFloat(scoreRaw.replace(",", "."));

          const title = textOf(
            card,
            "[data-testid='review-title']",
            ".c-review-block__title",
            "h3",
            "h4",
          );

          const dateRaw = textOf(
            card,
            "[data-testid='review-date']",
            ".c-review-block__date",
            ".review-date",
          );

          const guestName = textOf(
            card,
            "[data-testid='reviewer-name']",
            ".bui-avatar-block__title",
            ".reviewer-name",
          );
          const guestCountry = textOf(
            card,
            "[data-testid='reviewer-country']",
            ".bui-avatar-block__subtitle",
          );

          const bodies = Array.from(
            card.querySelectorAll(
              "[data-testid='review-content'] .review-score-widget, .c-review__body, [data-testid='review-positive-text'], [data-testid='review-negative-text'], .c-review__row",
            ),
          ).map((el) => el.textContent?.replace(/\s+/g, " ").trim() || "");

          // Prefer explicit latched / disliked rows when present
          const pros =
            textOf(
              card,
              "[data-testid='review-positive-text']",
              ".c-review__row:has(.c-review__prefix--help-block) .c-review__body",
              ".review_pos",
            ) || "";
          const cons =
            textOf(
              card,
              "[data-testid='review-negative-text']",
              ".c-review__row:has(.c-review__prefix--alwaysshow) .c-review__body",
              ".review_neg",
            ) || "";

          const allText = [title, pros, cons, ...bodies]
            .filter(Boolean)
            .join("\n")
            .replace(/\s+/g, " ")
            .trim();

          const reviewUrl =
            card.getAttribute("data-review-url") ||
            (card as HTMLElement).dataset?.reviewUrl ||
            "";

          return {
            score: Number.isFinite(score) ? score : 0,
            title,
            dateRaw,
            guestName: guestName || "Guest",
            guestCountry: guestCountry || "",
            pros,
            cons,
            text: allText,
            reviewUrl,
          };
        });
      });

      const scrapedAt = new Date().toISOString();
      return parsed
        .filter((r) => r.text || r.title || r.score)
        .map((r) => {
          const reviewDate =
            parseFlexibleDate(r.dateRaw) ||
            scrapedAt.slice(0, 10);
          const id = makeId([
            property.id,
            r.reviewUrl,
            r.guestName,
            reviewDate,
            r.title,
            String(r.score),
            r.text.slice(0, 120),
          ]);
          const text = r.text || [r.title, r.pros, r.cons].filter(Boolean).join(" ");
          return {
            id,
            propertyId: property.id,
            guestName: r.guestName,
            guestCountry: r.guestCountry,
            reviewDate,
            overallScore: r.score || 0,
            title: r.title || "Guest review",
            pros: r.pros,
            cons: r.cons,
            text,
            topics: classifyTopics(text),
            sentiment: sentimentFromScore(r.score || 0),
            scrapedAt,
            sourceUrl: url,
          } satisfies ScrapedReview;
        });
    } catch (err) {
      lastError = err;
      console.warn(
        `  retry ${attempt}/3 for ${property.id} offset=${offset}:`,
        err instanceof Error ? err.message : err,
      );
      await sleep(1500 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to scrape ${property.id} offset ${offset}`);
}

function loadExisting(): ScrapedReview[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    return Array.isArray(raw) ? raw : raw.reviews || [];
  } catch {
    return [];
  }
}

function saveReviews(reviews: ScrapedReview[]) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    count: reviews.length,
    reviews,
  };
  fs.writeFileSync(DATA_PATH, JSON.stringify(payload, null, 2), "utf8");
}

async function main() {
  const { pages, propertyFilter } = parseArgs();
  const targets = PROPERTIES.filter((p) =>
    propertyFilter ? p.id === propertyFilter : true,
  );

  console.log(
    `Scraping ${targets.length} properties × ${pages} page(s) each...`,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-AU",
    viewport: { width: 1365, height: 900 },
  });
  const page = await context.newPage();

  const collected: ScrapedReview[] = [];
  const errors: string[] = [];

  for (const property of targets) {
    console.log(`\n→ ${property.name}`);
    for (let i = 0; i < pages; i++) {
      const offset = i * 25;
      try {
        const batch = await scrapePage(page, property, offset);
        console.log(`  offset ${offset}: ${batch.length} reviews`);
        collected.push(...batch);
        if (batch.length === 0) break;
        await sleep(1200 + Math.random() * 800);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  FAILED offset ${offset}: ${msg}`);
        errors.push(`${property.id}@${offset}: ${msg}`);
      }
    }
  }

  await browser.close();

  const existing = loadExisting();
  const byId = new Map<string, ScrapedReview>();
  for (const r of existing) byId.set(r.id, r);
  for (const r of collected) byId.set(r.id, r); // newer scrape wins

  const merged = Array.from(byId.values()).sort((a, b) =>
    a.reviewDate < b.reviewDate ? 1 : -1,
  );

  saveReviews(merged);

  console.log(`\nSaved ${merged.length} unique reviews → ${DATA_PATH}`);
  console.log(`New/updated this run: ${collected.length}`);
  if (errors.length) {
    console.log(`Errors (${errors.length}):`);
    for (const e of errors) console.log(`  - ${e}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
