"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { OpsBriefInput, OpsBriefResult } from "@/lib/ai/opsBrief";
import { InfoTip } from "@/components/dashboard/InfoTip";

type Props = {
  input: OpsBriefInput;
};

const CACHE_PREFIX = "azzurro-ops-brief:";
/** In-memory cache so React Strict Mode remounts don't double-call AI. */
const memoryCache = new Map<string, OpsBriefResult>();

/** Filter-only key — AI runs when these change, not on every page reload. */
function filterCacheKey(input: OpsBriefInput) {
  return [
    input.propertyLabel,
    input.weekAvg,
    input.weekDelta,
    input.weekCount,
    input.overallAvg,
    input.total,
    input.positive,
    input.neutral,
    input.negative,
    input.topTopics
      .map(
        (t) =>
          `${t.label}:${t.mentionCount}:${t.negativeMentionCount}:${t.shareOfNegatives}`,
      )
      .join("|"),
  ].join("::");
}

function readCache(key: string): OpsBriefResult | null {
  const mem = memoryCache.get(key);
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpsBriefResult;
    if (!parsed?.summary || !Array.isArray(parsed.actions)) return null;
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, brief: OpsBriefResult) {
  memoryCache.set(key, brief);
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(brief));
  } catch {
    /* quota / private mode */
  }
}

export function OpsBriefPanel({ input }: Props) {
  const cacheKey = useMemo(() => filterCacheKey(input), [input]);
  const [brief, setBrief] = useState<OpsBriefResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef<string | null>(null);

  async function load(force = false) {
    if (!force) {
      const cached = readCache(cacheKey);
      if (cached) {
        setBrief(cached);
        setError(null);
        return;
      }
    }

    if (inFlightRef.current === cacheKey && !force) return;
    inFlightRef.current = cacheKey;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Could not load Ops Brief.");
        return;
      }
      const next: OpsBriefResult = {
        summary: data.summary,
        actions: data.actions || [],
        source: data.source === "ai" ? "ai" : "rules",
      };
      writeCache(cacheKey, next);
      setBrief(next);
    } catch {
      setError("Could not reach Insights API.");
    } finally {
      if (inFlightRef.current === cacheKey) inFlightRef.current = null;
      setBusy(false);
    }
  }

  useEffect(() => {
    const cached = readCache(cacheKey);
    if (cached) {
      setBrief(cached);
      setError(null);
      lastKeyRef.current = cacheKey;
      return;
    }
    // Only hit the API when this filter set has no cached brief
    if (lastKeyRef.current !== cacheKey) {
      lastKeyRef.current = cacheKey;
      void load(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-azzurro-accent/20 bg-azzurro-accent-soft/70 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 shrink-0 rounded-lg bg-azzurro-accent p-1.5 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-azzurro-navy">Ops Brief</p>
              <InfoTip label="About Ops Brief">
                Overview of the dashboard for your current filters (property,
                dates, sentiment, search). Cached for this filter set so a
                normal page refresh won’t spend AI tokens again — it reloads
                when you change filters, or when you press Refresh.
              </InfoTip>
              {brief && (
                <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-azzurro-navy ring-1 ring-azzurro-line">
                  {brief.source === "ai" ? "AI brief" : "Rule-based brief"}
                </span>
              )}
            </div>
            {busy && !brief && (
              <p className="mt-2 flex items-center gap-2 text-sm text-azzurro-ink/70">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Preparing today’s actions…
              </p>
            )}
            {error && (
              <p className="mt-2 text-sm text-azzurro-accent">{error}</p>
            )}
            {brief && (
              <>
                <p className="mt-1 text-sm leading-relaxed text-azzurro-ink/85">
                  {brief.summary}
                </p>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-azzurro-ink/90">
                  {brief.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          title="Force a new AI brief for these filters"
          onClick={() => void load(true)}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-azzurro-navy ring-1 ring-azzurro-line hover:bg-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </section>
  );
}
