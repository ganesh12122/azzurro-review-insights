# Developer journey — Azzurro Review Insights

Narrative of how this trial project was built (for README readers, demo walkthrough, and voice note prep). Written in first person as the submitting developer.

---

## Brief

Build a **Booking.com Review Insights** dashboard for four Azzurro Hotels properties so ops staff can see ratings, trends, and guest themes — without a Booking.com API key for this assessment.

Properties:

1. Olympic Hotel Paddington  
2. Potts Point  
3. Central Sydney  
4. Darling Harbour  

---

## Approach (why this stack)

Chose **Next.js + TypeScript + Tailwind + Recharts + Vercel** so the demo is one deployable app: UI, analytics, and API routes together. Avoided a separate FastAPI/Postgres stack for the timed trial — overkill when JSON + file import is enough to prove the product.

AI was planned from the start as an **ops layer** (brief + draft replies), not as a replacement for numbers. Charts stay deterministic so the dashboard never depends on a model being up.

---

## Journey in phases

### 1. Scaffold and seed

- Created the Next.js App Router project.
- Defined property config and review types.
- Seeded a realistic multi-week `reviews.json` so KPIs and charts work even when live scrape fails.

### 2. Analytics core

- Filters: property, date range, sentiment, keyword search.
- ISO week KPIs (current vs previous week).
- Property breakdown chart, weekly sentiment trends.
- Keyword **topic** insights (e.g. share of negatives mentioning cleanliness).

### 3. Collection reality check

- Built Playwright + Cheerio scrape against public review list URLs.
- Hit **Booking.com WAF** from automated/cloud IPs often enough that “always scrape live” was dishonest.
- Pivoted: **browser HTML/CSV/JSON upload** as primary path; scrape + GitHub Action as **best-effort** with honest statuses (`ok` / `partial` / `blocked` / `failed`).
- Added Import page + Sync logs (daily ~00:00 Sydney story).

### 4. Brand polish

- Aligned UI with [azzurrohotels.com](https://www.azzurrohotels.com/): navy + magenta accent, logo mark, Fraunces + DM Sans.
- Sidebar shell: Insights / Import / Sync logs; mobile drawer; collapsible desktop menu.

### 5. AI features

- Shortlisted only high-value AI:
  - **Ops Brief** — what staff should do from the current filter view.
  - **Draft reply** — copy-paste manager reply under each review.
- Wired OpenAI-compatible client from **env only** (`AI_GATEWAY_KEY` / `BASE_URL` / `MODEL`) so providers can be swapped.
- **Rule-based fallbacks** if AI is missing or fails; UI badges show AI vs rules/template.
- Cached Ops Brief per filter set so refresh does not burn tokens.

### 6. UX hardening + deploy

- Fixed a layout bug: closing the sidebar left a large empty gap on desktop/tablet (sticky width clash). Sidebar is now fixed; main padding tracks open/closed.
- Info tips (“i”) on Ops Brief and Draft reply for non-tech staff.
- Deployed to **Vercel**; production smoke-tested homepage + AI routes.
- Demo: https://azzurro-review-insights-orpin.vercel.app

---

## What works in the demo

1. Switch property / dates / sentiment / search → KPIs and charts update.  
2. Ops Brief summarises the filtered view with prioritised actions.  
3. Draft reply → Copy → paste into Booking.com (or email).  
4. Import sample CSV locally to show merge/dedupe.  
5. Sync logs explain daily best-effort collection vs reliable upload.

---

## Honest limitations (say in voice note)

- Live scrape is often blocked; import is the reliable free path for this trial.
- On Vercel, file writes from Import are ephemeral — demo uses committed seed data.
- No Booking category score cards or real reply-rate tracking yet (no reply state in data).
- Public APIs are unauthenticated — OK for a private trial link, not production-open.

---

## What I’d do next in production

1. Partner/review API or approved vendor for continuous ingest.  
2. Database + auth for staff.  
3. Store replies / response SLA.  
4. Digests (email/Slack) from Ops Brief.  
5. Optional LLM topic classifier behind the same topic schema.

---

## Key decisions log

| Decision | Why |
|---|---|
| Next.js monolith for trial | Fast demo, one deploy |
| Seed + import over live-only scrape | WAF; honesty |
| AI only for brief + reply | High ops value, low risk to core metrics |
| Env-only AI gateway | Portable, no secrets in code |
| Deterministic fallbacks | Demo never blank |
| Fixed sidebar + padding | Fix collapse gap on tablet/desktop |
