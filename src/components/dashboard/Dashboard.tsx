"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PROPERTIES } from "@/data/properties";
import type { PropertyId, Review } from "@/lib/types";
import {
  buildKpis,
  filterReviews,
  propertyBreakdown,
  sentimentTrendByWeek,
  topicInsights,
} from "@/lib/analytics";
import { TOPIC_LABELS } from "@/lib/topics";
import { TrendingDown, TrendingUp } from "lucide-react";
import { OpsBriefPanel } from "@/components/dashboard/OpsBriefPanel";
import { DraftReplyButton } from "@/components/dashboard/DraftReplyButton";
import type { OpsBriefInput } from "@/lib/ai/opsBrief";

type Props = {
  reviews: Review[];
  updatedAt: string | null;
};

export function Dashboard({ reviews, updatedAt }: Props) {
  const [propertyId, setPropertyId] = useState<PropertyId | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sentiment, setSentiment] = useState<
    "all" | "positive" | "neutral" | "negative"
  >("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      filterReviews(reviews, {
        propertyId,
        from: from || undefined,
        to: to || undefined,
        sentiment,
        query: query || undefined,
      }),
    [reviews, propertyId, from, to, sentiment, query],
  );

  const kpis = useMemo(() => buildKpis(filtered), [filtered]);
  const breakdown = useMemo(() => propertyBreakdown(filtered), [filtered]);
  const trends = useMemo(() => sentimentTrendByWeek(filtered), [filtered]);
  const insights = useMemo(() => topicInsights(filtered), [filtered]);

  const propertyName = (id: PropertyId) =>
    PROPERTIES.find((p) => p.id === id)?.shortName || id;

  const propertyLabel =
    propertyId === "all"
      ? "All properties"
      : PROPERTIES.find((p) => p.id === propertyId)?.name || propertyId;

  const opsBriefInput: OpsBriefInput = useMemo(
    () => ({
      propertyLabel,
      weekAvg: kpis.currentWeek.avg,
      weekDelta: kpis.delta,
      weekCount: kpis.currentWeek.count,
      overallAvg: kpis.overallAvg,
      total: kpis.total,
      positive: kpis.positive,
      neutral: kpis.neutral,
      negative: kpis.negative,
      topTopics: insights.slice(0, 4).map((t) => ({
        label: t.label,
        mentionCount: t.mentionCount,
        negativeMentionCount: t.negativeMentionCount,
        shareOfNegatives: t.shareOfNegatives,
      })),
      sampleNegatives: filtered
        .filter((r) => r.sentiment === "negative")
        .slice(0, 5)
        .map((r) => ({
          score: r.overallScore,
          title: r.title,
          text: r.text.slice(0, 220),
          property: propertyName(r.propertyId),
        })),
    }),
    [propertyLabel, kpis, insights, filtered],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:gap-7 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <header className="relative overflow-hidden rounded-2xl border border-azzurro-line bg-azzurro-navy px-5 py-6 text-white sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-azzurro-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-azzurro-azure/25 blur-2xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-azzurro-accent">
          Azzurro Hotels · Operations
        </p>
        <h1 className="font-display mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Booking.com Review Insights
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
          Guest sentiment across Sydney properties — weekly movement, recurring
          ops issues, and a clear feed for non-technical staff.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
          <span className="rounded-full bg-white/10 px-2.5 py-1">
            {filtered.length} reviews in view
          </span>
          {updatedAt && (
            <span className="rounded-full bg-white/10 px-2.5 py-1">
              Updated {updatedAt.slice(0, 19).replace("T", " ")} UTC
            </span>
          )}
          <a
            href="https://www.azzurrohotels.com/locations"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-azzurro-accent/20 px-2.5 py-1 text-azzurro-accent-soft hover:bg-azzurro-accent/30"
          >
            View locations on azzurrohotels.com
          </a>
        </div>
      </header>

      <section className="azzurro-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Property">
          <select
            className="azzurro-input w-full"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value as PropertyId | "all")}
          >
            <option value="all">All properties</option>
            {PROPERTIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From date">
          <input
            type="date"
            className="azzurro-input w-full"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="To date">
          <input
            type="date"
            className="azzurro-input w-full"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <Field label="Sentiment">
          <select
            className="azzurro-input w-full"
            value={sentiment}
            onChange={(e) =>
              setSentiment(e.target.value as typeof sentiment)
            }
          >
            <option value="all">All</option>
            <option value="positive">Positive (≥8)</option>
            <option value="neutral">Neutral (6–7.9)</option>
            <option value="negative">Negative (&lt;6)</option>
          </select>
        </Field>
        <Field label="Search">
          <input
            type="search"
            placeholder="Keyword…"
            className="azzurro-input w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Avg rating this week"
          value={kpis.currentWeek.avg?.toFixed(1) ?? "—"}
          hint={`${kpis.currentWeek.start} → ${kpis.currentWeek.end} · ${kpis.currentWeek.count} reviews`}
        />
        <Kpi
          label="vs previous week"
          value={
            kpis.delta == null
              ? "—"
              : `${kpis.delta > 0 ? "+" : ""}${kpis.delta.toFixed(1)}`
          }
          hint={`Prev avg ${kpis.previousWeek.avg?.toFixed(1) ?? "—"} · ${kpis.previousWeek.count} reviews`}
          tone={
            kpis.delta == null ? "neutral" : kpis.delta >= 0 ? "good" : "bad"
          }
          icon={
            kpis.delta == null ? undefined : kpis.delta >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )
          }
        />
        <Kpi
          label="Reviews in view"
          value={String(kpis.total)}
          hint={`${kpis.positive} pos · ${kpis.neutral} neu · ${kpis.negative} neg`}
        />
        <Kpi
          label="Overall avg (filtered)"
          value={kpis.overallAvg?.toFixed(1) ?? "—"}
          hint={`Week as-of ${kpis.asOf}`}
        />
      </section>

      <OpsBriefPanel input={opsBriefInput} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="azzurro-card p-5">
          <h2 className="font-display text-lg font-semibold text-azzurro-navy">
            Property rating breakdown
          </h2>
          <p className="mt-1 text-xs text-azzurro-muted">
            Average Booking.com score by Azzurro location
          </p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdown.map((b) => ({
                  name: propertyName(b.propertyId),
                  avg: b.avg ?? 0,
                  reviews: b.count,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e0ea" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5b6b7c" }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#5b6b7c" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#d7e0ea",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="avg" fill="#0a1b33" name="Avg rating" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-azzurro-muted">
            {breakdown.map((b) => (
              <li
                key={b.propertyId}
                className="flex justify-between gap-2 border-b border-azzurro-line/60 py-1.5 last:border-0"
              >
                <span className="font-medium text-azzurro-ink">
                  {propertyName(b.propertyId)}
                </span>
                <span>
                  {b.avg?.toFixed(1) ?? "—"} · {b.count} reviews · {b.negative}{" "}
                  neg
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="azzurro-card p-5">
          <h2 className="font-display text-lg font-semibold text-azzurro-navy">
            Positive / negative trends
          </h2>
          <p className="mt-1 text-xs text-azzurro-muted">Weekly sentiment volume</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e0ea" />
                <XAxis dataKey="weekStart" tick={{ fontSize: 10, fill: "#5b6b7c" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5b6b7c" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#d7e0ea",
                    fontSize: 12,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="positive"
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="negative"
                  stroke="#e91e8c"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="neutral"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="azzurro-card overflow-hidden p-0">
        <div className="border-b border-azzurro-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-azzurro-navy">
            Recurring operational topics
          </h2>
          <p className="mt-1 text-xs text-azzurro-muted">
            Keyword themes from guest text — cleanliness, check-in, staff, noise…
          </p>
        </div>
        <div className="overflow-x-auto px-5">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-azzurro-muted">
              <tr>
                <th className="py-3 pr-3">Topic</th>
                <th className="py-3 pr-3">Mentions</th>
                <th className="py-3 pr-3">In negatives</th>
                <th className="py-3">Share of negatives</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((t) => (
                <tr key={t.topic} className="border-t border-azzurro-line/70">
                  <td className="py-3 pr-3 font-medium text-azzurro-ink">
                    {t.label}
                  </td>
                  <td className="py-3 pr-3">{t.mentionCount}</td>
                  <td className="py-3 pr-3">{t.negativeMentionCount}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-azzurro-mist">
                        <div
                          className="h-full rounded-full bg-azzurro-accent"
                          style={{
                            width: `${Math.min(100, Math.round(t.shareOfNegatives * 100))}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-azzurro-navy">
                        {Math.round(t.shareOfNegatives * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {!insights.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-azzurro-muted">
                    No topic matches in this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="azzurro-card p-5">
        <h2 className="font-display text-lg font-semibold text-azzurro-navy">
          Review feed
        </h2>
        <p className="mt-1 text-xs text-azzurro-muted">
          Browse individual Booking.com guest comments
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {filtered.slice(0, 40).map((r) => (
            <article
              key={r.id}
              className="rounded-xl border border-azzurro-line/80 bg-gradient-to-br from-white to-azzurro-mist/40 px-4 py-3.5 transition hover:border-azzurro-accent/30"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-azzurro-muted">
                <span
                  className={`rounded-md px-1.5 py-0.5 font-semibold text-white ${
                    r.overallScore >= 8
                      ? "bg-teal-700"
                      : r.overallScore >= 6
                        ? "bg-azzurro-navy"
                        : "bg-azzurro-accent"
                  }`}
                >
                  {r.overallScore.toFixed(1)}
                </span>
                <span className="font-semibold text-azzurro-ink">{r.title}</span>
                <span>· {propertyName(r.propertyId)}</span>
                <span>· {r.reviewDate}</span>
                <span>
                  · {r.guestName}
                  {r.guestCountry ? ` (${r.guestCountry})` : ""}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-azzurro-ink/85">
                {r.text}
              </p>
              {r.topics.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {r.topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-azzurro-navy ring-1 ring-azzurro-line"
                    >
                      {TOPIC_LABELS[t]}
                    </span>
                  ))}
                </div>
              )}
              <DraftReplyButton
                review={r}
                propertyName={
                  PROPERTIES.find((p) => p.id === r.propertyId)?.name ||
                  propertyName(r.propertyId)
                }
              />
            </article>
          ))}
          {!filtered.length && (
            <p className="text-sm text-azzurro-muted">
              No reviews match these filters.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold tracking-wide text-azzurro-muted">
      {label}
      {children}
    </label>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "good" | "bad";
  icon?: ReactNode;
}) {
  const valueColor =
    tone === "good"
      ? "text-teal-700"
      : tone === "bad"
        ? "text-azzurro-accent"
        : "text-azzurro-navy";
  return (
    <div className="azzurro-card relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-azzurro-accent/5" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-azzurro-muted">
          {label}
        </p>
        {icon && <span className={valueColor}>{icon}</span>}
      </div>
      <p className={`font-display mt-2 text-3xl font-semibold ${valueColor}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-azzurro-muted">{hint}</p>
    </div>
  );
}
