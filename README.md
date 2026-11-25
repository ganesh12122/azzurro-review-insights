# Azzurro Review Insights

Booking.com review insights dashboard for Azzurro Hotels properties.

Turns guest feedback into KPIs, category scores, trends, searchable reviews, AI ops insights, and draft management replies.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Recharts + Lucide
- AI via Next.js Route Handlers (optional LLM key) with deterministic fallback
- Deploy: Vercel

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

See `.env.example`. LLM keys stay in `.env.local` / Vercel env vars — never commit secrets.

## Project layout

```
src/
  app/                 # pages + API routes
  components/dashboard # UI modules (built during trial)
  data/                # properties + sample reviews
  lib/                 # types + helpers
```

## Production notes

This assessment demo uses structured sample data (or portal CSV) so the demo stays reliable without Booking.com partner credentials.

A production version could add:

- Postgres + auth for multi-property ops teams
- Scheduled sync / Booking Connectivity webhooks when partner access exists
- Owner assignment + SLA tracking on action items

## License

Private assessment submission — not for redistribution.
