"use client";

import { useMemo, useState } from "react";
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
type Props = {
  reviews: Review[];
  updatedAt: string | null;
};

export function Dashboard({ reviews, updatedAt }: Props) {
  const [propertyId, setPropertyId] = useState<PropertyId | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sentiment, setSentiment] = useState<"all" | "positive" | "neutral" | "negative">("all");
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

  const topNegativeTopic = insights.find((i) => i.negativeMentionCount > 0);
  const insightLine = topNegativeTopic
    ? `${Math.round(topNegativeTopic.shareOfNegatives * 100)}% of negative reviews in this view mentioned ${topNegativeTopic.label.toLowerCase()}-related issues.`
    : "Not enough negative reviews in this filter to compute a topic share.";

  const propertyName = (id: PropertyId) =>
    PROPERTIES.find((p) => p.id === id)?.shortName || id;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-2 border-b border-slate-200 pb-4">
        <p className="text-sm font-medium text-sky-800">Azzurro Hotels · Operations</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Booking.com Review Insights
        </h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Built for non-technical ops staff — weekly rating movement, property
          comparison, review feed, and recurring issue topics across four
          properties.
        </p>
        <p className="text-xs text-slate-500">
          {filtered.length} reviews in view
          {updatedAt ? ` · dataset updated ${updatedAt.slice(0, 19).replace("T", " ")} UTC` : ""}
        </p>
      </header>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Property
          <select
            className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900"
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
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          From date
          <input
            type="date"
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          To date
          <input
            type="date"
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Sentiment
          <select
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
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
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Search
          <input
            type="search"
            placeholder="Keyword…"
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          tone={kpis.delta == null ? "neutral" : kpis.delta >= 0 ? "good" : "bad"}
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

      <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Ops insight</p>
        <p className="mt-1">{insightLine}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Property rating breakdown
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdown.map((b) => ({
                  name: propertyName(b.propertyId),
                  avg: b.avg ?? 0,
                  reviews: b.count,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="#0369a1" name="Avg rating" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {breakdown.map((b) => (
              <li key={b.propertyId} className="flex justify-between gap-2">
                <span>{propertyName(b.propertyId)}</span>
                <span>
                  {b.avg?.toFixed(1) ?? "—"} · {b.count} reviews · {b.negative} neg
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Positive / negative trends by week
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="positive" stroke="#15803d" strokeWidth={2} />
                <Line type="monotone" dataKey="negative" stroke="#b91c1c" strokeWidth={2} />
                <Line type="monotone" dataKey="neutral" stroke="#64748b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Recurring operational topics
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">Topic</th>
                <th className="py-2 pr-3">Mentions</th>
                <th className="py-2 pr-3">In negatives</th>
                <th className="py-2">Share of negatives</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((t) => (
                <tr key={t.topic} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-800">{t.label}</td>
                  <td className="py-2 pr-3">{t.mentionCount}</td>
                  <td className="py-2 pr-3">{t.negativeMentionCount}</td>
                  <td className="py-2">
                    {Math.round(t.shareOfNegatives * 100)}%
                  </td>
                </tr>
              ))}
              {!insights.length && (
                <tr>
                  <td colSpan={4} className="py-4 text-slate-500">
                    No topic matches in this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Review feed</h2>
        <div className="flex flex-col gap-3">
          {filtered.slice(0, 40).map((r) => (
            <article
              key={r.id}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span
                  className={`rounded px-1.5 py-0.5 font-semibold text-white ${
                    r.overallScore >= 8
                      ? "bg-emerald-700"
                      : r.overallScore >= 6
                        ? "bg-slate-500"
                        : "bg-red-700"
                  }`}
                >
                  {r.overallScore.toFixed(1)}
                </span>
                <span className="font-medium text-slate-800">{r.title}</span>
                <span>· {propertyName(r.propertyId)}</span>
                <span>· {r.reviewDate}</span>
                <span>
                  · {r.guestName}
                  {r.guestCountry ? ` (${r.guestCountry})` : ""}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{r.text}</p>
              {r.topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
                    >
                      {TOPIC_LABELS[t]}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
          {!filtered.length && (
            <p className="text-sm text-slate-500">No reviews match these filters.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const valueColor =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-red-700"
        : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-semibold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
