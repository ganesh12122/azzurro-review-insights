# Azzurro Review Insights

Booking.com review insights for **Azzurro Hotels** (Sydney) — an ops dashboard for non-technical staff across four properties.

**Live demo:** https://azzurro-review-insights-orpin.vercel.app  
**GitHub:** https://github.com/ganesh12122/azzurro-review-insights

Deeper docs:

- [Architecture](docs/ARCHITECTURE.md) — system design, data flow, AI, deploy notes  
- [Developer journey](docs/DEVELOPER-JOURNEY.md) — how and why it was built for the trial  

---

## Properties

| Property | Booking.com |
|---|---|
| Olympic Hotel Paddington | [olympic-paddington](https://www.booking.com/hotel/au/olympic-paddington.html) |
| Potts Point | [venus-potts-point-sydney](https://www.booking.com/hotel/au/venus-potts-point-sydney.html) |
| Central Sydney | [venus-surry-hills](https://www.booking.com/hotel/au/venus-surry-hills.html) |
| Darling Harbour | [chateau-de-venus](https://www.booking.com/hotel/au/chateau-de-venus.html) |

Brand UI follows [azzurrohotels.com](https://www.azzurrohotels.com/) (navy + magenta, logo, hospitality-ops layout).

---

## What you can do in the app

| Area | Capability |
|---|---|
| Insights | Week vs previous week rating, review counts, sentiment mix |
| Filters | Property, date range, sentiment, keyword search |
| Charts | Property rating breakdown; positive / neutral / negative by week |
| Topics | Keyword themes (cleanliness, check-in, staff, noise, …) with % of negatives |
| Ops Brief | Shared **one AI overview per Sydney day** on default view (all staff reuse it). Custom filters stay rule-based until **Generate AI brief**. Rule-based fallback if AI fails. |
| Draft reply | Generate + copy a Booking.com-style reply under each review |
| Import | Upload HTML / CSV / JSON — dedupe by id, merge into dataset |
| Sync logs | Daily best-effort scrape status (honest blocked/failed states) |

---

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Recharts** + **Lucide**
- **Optional AI** via OpenAI-compatible gateway (`AI_GATEWAY_*` env)
- **Vercel** hosting; data as structured **JSON/CSV** (no required DB for demo)
- **Playwright + Cheerio** for best-effort public collection

---

## Quick start

```bash
npm install
npx playwright install chromium   # only needed for scrape scripts
npm run seed                      # if reviews.json is missing
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional AI

Copy [`.env.example`](.env.example) → `.env.local`:

```bash
AI_GATEWAY_KEY=
AI_GATEWAY_BASE_URL=     # .../v1
AI_GATEWAY_MODEL=
```

If unset or the gateway fails, Ops Brief and Draft reply still work via **deterministic fallbacks**.

### Production build

```bash
npm run build
npm start
```

---

## Data collection (no Booking.com API)

Booking.com does **not** expose a public reviews API for this use case.

| Method | Role |
|---|---|
| **Import HTML/CSV/JSON** | **Primary** — free and reliable |
| Seed `reviews.json` | Demo baseline |
| Playwright scrape | Best-effort (often WAF-blocked) |
| GitHub Action ~00:00 Sydney | Best-effort cron |

**Reliable flow:** browser export → Upload on **/import** → dedupe/merge → Insights refresh.

Sample CSV: [`src/data/sample-reviews.csv`](src/data/sample-reviews.csv)

```bash
npm run scrape              # best-effort
npm run scrape -- --pages=3
npm run import:html         # from src/data/raw/
```

Sync statuses are honest: `ok` / `partial` / `blocked` / `failed`. A blocked run keeps existing data.

Optional Sync-now env (production):

```bash
GITHUB_TOKEN=               # or SYNC_DISPATCH_TOKEN
SYNC_REPO=ganesh12122/azzurro-review-insights
ALLOW_LOCAL_SYNC=true       # local/dev Playwright only
```

**Do not commit passwords, cookies, or API keys.**

---

## Architecture (short)

```
Browser / seed / scrape
        ↓
  reviews.json (deduped)
        ↓
  analytics + topics  →  charts & KPIs
        ↓
  /api/insights · /api/reply  →  AI gateway (optional) + rule fallbacks
        ↓
  Dashboard (AppShell)
```

Insights methodology:

- **Sentiment:** ≥8 positive · 6–7.9 neutral · &lt;6 negative  
- **Topics:** keyword rules per ops theme  
- **Weeks:** ISO Mon–Sun relative to latest review in the filtered set  

Full diagrams and file map: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## So far — trial build summary

1. Scaffolded Next.js ops dashboard for four properties.  
2. Seeded data + week KPIs, charts, filters, topic insights.  
3. Hit scrape WAF → made **import** the reliable path; sync logs stay honest.  
4. Brand UI aligned with Azzurro site; sidebar + mobile shell.  
5. AI **Ops Brief** + **Draft reply** with env-only gateway and fallbacks; shared daily Ops Brief cache (Sydney day).  
6. Fixed sidebar-collapse layout gap on desktop/tablet.  
7. Deployed and smoke-tested on Vercel.

Story and decisions: [docs/DEVELOPER-JOURNEY.md](docs/DEVELOPER-JOURNEY.md).

---

## Deploy notes

- Basic demo needs **no secrets** (seeded JSON).  
- For AI on Vercel, set the same `AI_GATEWAY_*` vars in the project.  
- Import writes to the filesystem — **ephemeral on serverless**; use committed data for the public demo.  
- Keep the demo URL private if possible (APIs are unauthenticated for the trial).

```bash
npx vercel --prod
```

---

## License

Private assessment submission — not for redistribution.
