# Azzurro Review Insights

Booking.com review insights dashboard for **four Azzurro Hotels properties**, built for non-technical operations staff.

## Properties

| Property | Booking.com page |
|---|---|
| Olympic Hotel Paddington | https://www.booking.com/hotel/au/olympic-paddington.html |
| Potts Point | https://www.booking.com/hotel/au/venus-potts-point-sydney.html |
| Central Sydney | https://www.booking.com/hotel/au/venus-surry-hills.html |
| Darling Harbour | https://www.booking.com/hotel/au/chateau-de-venus.html |

## Features

- **Week KPIs:** average rating for the current ISO week vs previous week
- **Property breakdown:** rating comparison across the four properties
- **Review feed:** browse individual reviews
- **Filters:** property, date range, sentiment, keyword search
- **Trends:** positive / neutral / negative counts by week
- **Operational insights:** keyword topic grouping (cleanliness, check-in, staff, noise, facilities, location, room condition, value) with shares such as *“X% of negative reviews mentioned cleanliness”*
- **Ops Brief:** prioritized onsite actions from the current filter (AI when configured, rule-based fallback otherwise)
- **Draft reply:** Booking.com-style manager replies per review, with copy-to-clipboard

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Recharts for charts
- Playwright + Cheerio for public review collection
- Local JSON dataset (dashboard works without an AI key)
- Optional OpenAI-compatible AI gateway via env (`AI_GATEWAY_*`)

## Setup

```bash
npm install
npx playwright install chromium
npm run seed      # bootstrap sample dataset (if needed)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional AI (OpenAI-compatible)

Copy [`.env.example`](.env.example) → `.env.local` and set:

```bash
AI_GATEWAY_KEY=your-key
AI_GATEWAY_BASE_URL=https://your-provider.example/v1
AI_GATEWAY_MODEL=your-model-alias
```

Any OpenAI-compatible `POST /chat/completions` endpoint works. If these are missing, Ops Brief and Draft reply still work via deterministic fallbacks.

### Production build

```bash
npm run build
npm start
```

## Review collection (no Booking.com API)

Booking.com does **not** provide API access for this use case.

### Recommended (free + reliable): browser export → upload

Automated scrape from cloud IPs is often blocked by Booking.com’s WAF. The **reliable free path** is:

1. Open a property review page in a normal browser (human session).
2. Save the page as **HTML**, or maintain a simple **CSV/JSON** export.
3. Upload via the dashboard **Reliable import** panel (or `POST /api/reviews/import`).
4. Reviews are **deduped by id** and merged into `src/data/reviews.json`.

Sample CSV: `src/data/sample-reviews.csv`

```bash
# CLI HTML import (drop files in src/data/raw/ first)
npm run import:html
```

### Best-effort automated collector

Still included for when the network allows it:

### Method

1. **Playwright Chromium** opens each property’s public review list:
   `https://www.booking.com/reviewlist.html?cc1=au&pagename=<slug>&rows=25&offset=N`
2. HTML is saved under `src/data/raw/` (gitignored) for debugging.
3. **Cheerio** parses review cards (score, title, date, guest, text).
4. Reviews are tagged with operational **topics** and **sentiment**.
5. Results merge into `src/data/reviews.json` with **SHA1-based IDs** to avoid duplicates and support incremental updates.
6. Each run writes **`lastSync`** metadata + `src/data/sync-log.json` history (success / partial / failed). Failed scrapes do **not** pretend the property needs “nothing”.

```bash
npm run scrape              # all properties, 2 pages each
npm run scrape -- --pages=3
npm run scrape -- --property=darling-harbour
```

### Periodic sync (daily) + Sync now

| Mechanism | Role |
|---|---|
| **Dashboard upload** | **Primary** — free, reliable, no WAF |
| **GitHub Action** daily scrape | Best-effort; may be blocked from GitHub runners |
| **Sync now** | Best-effort live scrape / workflow dispatch |

Honest status: scrape runs log `ok` / `partial` / `blocked` / `failed`. A blocked run **keeps existing data** and never reports “all clear”.

Flow (reliable): **Browser page → HTML/CSV/JSON → import API → dedupe/merge → dashboard**.

Optional env for production Sync now:

```bash
GITHUB_TOKEN=ghp_xxx          # or SYNC_DISPATCH_TOKEN
SYNC_REPO=ganesh12122/azzurro-review-insights
ALLOW_LOCAL_SYNC=true         # only for local/dev hosts that can run Playwright
```

### HTML import fallback

If live scraping is blocked by Booking.com’s bot protection (WAF/challenge pages), save reviewlist HTML manually into `src/data/raw/` and run:

```bash
npm run import:html
```

### Bootstrap dataset

`npm run seed` writes a realistic multi-week bootstrap dataset so the dashboard remains usable for demos when live scrape is blocked. Live scrapes / HTML imports merge on top (same IDs → update, new IDs → append).

### Reliability & limitations

| Topic | Notes |
|---|---|
| Bot protection | Booking.com often serves challenge pages to datacenter/automated browsers. The scraper retries, dumps raw HTML, and continues other properties. |
| Markup drift | CSS selectors can change; raw HTML dumps help update parsers quickly. |
| Rate limiting | Built-in delays between pages/properties; keep page counts modest. |
| Legal / ToS | Public pages only; no credentials. Review Booking.com terms for your jurisdiction before production use. |
| Ideal production path | Booking Connectivity / partner review APIs (owner credentials), or an approved data vendor — not covered in this trial. |

**Do not commit passwords, cookies, API keys, or personal credentials.**

## Architecture

```
scripts/
  scrape-reviews.mjs   # Playwright collector + merge
  import-html.mjs      # Import saved reviewlist HTML
  seed-reviews.mjs     # Bootstrap dataset
src/
  app/                 # Next.js UI
  components/dashboard # Ops dashboard
  data/
    properties.ts      # Four portal properties
    reviews.json       # Collected / seeded reviews
  lib/
    analytics.ts       # Week KPIs, trends, filters
    topics.ts          # Keyword topic classification
    loadReviews.ts     # Dataset loader
```

### Insights methodology

- **Sentiment:** score ≥8 positive, 6–7.9 neutral, &lt;6 negative (Booking.com 1–10 scale).
- **Topics:** keyword/phrase rules per ops theme (cleanliness, check-in, staff, noise, facilities, location, room condition, value).
- **Limitation:** keyword rules miss sarcasm/nuance and multilingual text; an LLM classifier can be added later behind the same topic schema.

### Week comparison

“Current week” / “previous week” use **ISO weeks (Mon–Sun)** relative to the latest review date in the filtered dataset, so demos stay meaningful even if wall-clock “this week” is sparse.

## Deploy

Vercel-ready (`npm run build`). Set no secrets for the basic demo.

```bash
npx vercel
```

## License

Private assessment submission — not for redistribution.
