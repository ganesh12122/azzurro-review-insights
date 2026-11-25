import type { PropertyId, Review, TopicId, TopicInsight } from "@/lib/types";
import { TOPIC_LABELS } from "@/lib/topics";

export function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Mon=1 ... Sun=7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Prefer latest review date so demos still have a meaningful "current week". */
export function resolveAsOf(reviews: Review[], fallback?: Date): Date {
  if (!reviews.length) return fallback ?? parseIsoDate("1970-01-01");
  const max = reviews.reduce((m, r) => (r.reviewDate > m ? r.reviewDate : m), reviews[0].reviewDate);
  return parseIsoDate(max);
}

export function weekWindow(asOf: Date) {
  const currentStart = startOfIsoWeek(asOf);
  const currentEnd = addDays(currentStart, 6);
  const previousStart = addDays(currentStart, -7);
  const previousEnd = addDays(currentStart, -1);
  return { currentStart, currentEnd, previousStart, previousEnd };
}

export function inRange(iso: string, start: Date, end: Date) {
  return iso >= toIsoDate(start) && iso <= toIsoDate(end);
}

export function avgScore(reviews: Review[]): number | null {
  if (!reviews.length) return null;
  const sum = reviews.reduce((a, r) => a + r.overallScore, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export function filterReviews(
  reviews: Review[],
  opts: {
    propertyId?: PropertyId | "all";
    from?: string;
    to?: string;
    sentiment?: "all" | "positive" | "neutral" | "negative";
    query?: string;
  },
): Review[] {
  return reviews.filter((r) => {
    if (opts.propertyId && opts.propertyId !== "all" && r.propertyId !== opts.propertyId) {
      return false;
    }
    if (opts.from && r.reviewDate < opts.from) return false;
    if (opts.to && r.reviewDate > opts.to) return false;
    if (opts.sentiment && opts.sentiment !== "all" && r.sentiment !== opts.sentiment) {
      return false;
    }
    if (opts.query) {
      const q = opts.query.toLowerCase();
      const blob = `${r.title} ${r.text} ${r.pros} ${r.cons} ${r.guestName}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

export function propertyBreakdown(reviews: Review[]) {
  const map = new Map<PropertyId, Review[]>();
  for (const r of reviews) {
    const list = map.get(r.propertyId) || [];
    list.push(r);
    map.set(r.propertyId, list);
  }
  return Array.from(map.entries()).map(([propertyId, list]) => ({
    propertyId,
    count: list.length,
    avg: avgScore(list),
    negative: list.filter((r) => r.sentiment === "negative").length,
    positive: list.filter((r) => r.sentiment === "positive").length,
  }));
}

export function sentimentTrendByWeek(reviews: Review[]) {
  const buckets = new Map<
    string,
    { weekStart: string; positive: number; neutral: number; negative: number; avgSum: number; count: number }
  >();

  for (const r of reviews) {
    const start = toIsoDate(startOfIsoWeek(parseIsoDate(r.reviewDate)));
    const b = buckets.get(start) || {
      weekStart: start,
      positive: 0,
      neutral: 0,
      negative: 0,
      avgSum: 0,
      count: 0,
    };
    b[r.sentiment] += 1;
    b.avgSum += r.overallScore;
    b.count += 1;
    buckets.set(start, b);
  }

  return Array.from(buckets.values())
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
    .map((b) => ({
      weekStart: b.weekStart,
      positive: b.positive,
      neutral: b.neutral,
      negative: b.negative,
      avg: b.count ? Math.round((b.avgSum / b.count) * 10) / 10 : 0,
      count: b.count,
    }));
}

export function topicInsights(reviews: Review[]): TopicInsight[] {
  const negatives = reviews.filter((r) => r.sentiment === "negative");
  const negTotal = negatives.length || 1;

  return (Object.keys(TOPIC_LABELS) as TopicId[])
    .map((topic) => {
      const mentionCount = reviews.filter((r) => r.topics.includes(topic)).length;
      const negativeMentionCount = negatives.filter((r) =>
        r.topics.includes(topic),
      ).length;
      return {
        topic,
        label: TOPIC_LABELS[topic],
        mentionCount,
        negativeMentionCount,
        shareOfNegatives: negativeMentionCount / negTotal,
      };
    })
    .filter((t) => t.mentionCount > 0)
    .sort((a, b) => b.negativeMentionCount - a.negativeMentionCount);
}

export function buildKpis(reviews: Review[]) {
  const asOf = resolveAsOf(reviews);
  const { currentStart, currentEnd, previousStart, previousEnd } = weekWindow(asOf);
  const current = reviews.filter((r) =>
    inRange(r.reviewDate, currentStart, currentEnd),
  );
  const previous = reviews.filter((r) =>
    inRange(r.reviewDate, previousStart, previousEnd),
  );
  const currentAvg = avgScore(current);
  const previousAvg = avgScore(previous);
  const delta =
    currentAvg != null && previousAvg != null
      ? Math.round((currentAvg - previousAvg) * 10) / 10
      : null;

  return {
    asOf: toIsoDate(asOf),
    currentWeek: {
      start: toIsoDate(currentStart),
      end: toIsoDate(currentEnd),
      avg: currentAvg,
      count: current.length,
    },
    previousWeek: {
      start: toIsoDate(previousStart),
      end: toIsoDate(previousEnd),
      avg: previousAvg,
      count: previous.length,
    },
    delta,
    overallAvg: avgScore(reviews),
    total: reviews.length,
    positive: reviews.filter((r) => r.sentiment === "positive").length,
    neutral: reviews.filter((r) => r.sentiment === "neutral").length,
    negative: reviews.filter((r) => r.sentiment === "negative").length,
  };
}
