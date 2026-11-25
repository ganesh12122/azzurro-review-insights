"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import type { OpsBriefInput, OpsBriefResult } from "@/lib/ai/opsBrief";
import type { FilterScope } from "@/lib/ai/opsBriefCache";
import { InfoTip } from "@/components/dashboard/InfoTip";

type Props = {
  input: OpsBriefInput;
  filterScope: FilterScope;
};

type BriefState = OpsBriefResult & {
  cached?: boolean;
  day?: string;
  at?: string;
};

function isDefaultScope(scope: FilterScope) {
  return (
    (scope.propertyId === "all" || !scope.propertyId) &&
    !scope.from &&
    !scope.to &&
    (scope.sentiment === "all" || !scope.sentiment) &&
    !scope.query.trim()
  );
}

export function OpsBriefPanel({ input, filterScope }: Props) {
  const isDefault = useMemo(() => isDefaultScope(filterScope), [filterScope]);
  const scopeSig = useMemo(
    () =>
      [
        filterScope.propertyId,
        filterScope.from,
        filterScope.to,
        filterScope.sentiment,
        filterScope.query.trim().toLowerCase(),
      ].join("|"),
    [filterScope],
  );

  const [brief, setBrief] = useState<BriefState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSigRef = useRef<string | null>(null);
  const inFlightRef = useRef<string | null>(null);

  async function load(opts: {
    force?: boolean;
    mode: "auto" | "rules" | "ai";
  }) {
    const flightKey = `${scopeSig}:${opts.mode}:${opts.force ? "1" : "0"}`;
    if (inFlightRef.current === flightKey) return;
    inFlightRef.current = flightKey;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          filterScope,
          force: Boolean(opts.force),
          mode: opts.mode,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Could not load Ops Brief.");
        return;
      }
      setBrief({
        summary: data.summary,
        actions: data.actions || [],
        source: data.source === "ai" ? "ai" : "rules",
        cached: Boolean(data.cached),
        day: data.day,
        at: data.at,
      });
    } catch {
      setError("Could not reach Insights API.");
    } finally {
      if (inFlightRef.current === flightKey) inFlightRef.current = null;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (lastSigRef.current === scopeSig) return;
    lastSigRef.current = scopeSig;
    setBrief(null);
    // Default view: shared daily AI brief (server cache).
    // Custom filters: rule-based only until staff clicks Generate AI brief.
    void load({ mode: isDefault ? "auto" : "rules", force: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeSig, isDefault]);

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
                Default view (all properties): one shared AI overview per Sydney
                day for every staff member — opening the app again does not
                re-spend tokens. Custom filters use a free rule-based brief
                unless you click Generate AI brief. Refresh forces a new shared
                brief for this view.
              </InfoTip>
              {brief && (
                <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-azzurro-navy ring-1 ring-azzurro-line">
                  {brief.source === "ai" ? "AI brief" : "Rule-based brief"}
                </span>
              )}
              {brief?.cached && (
                <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-azzurro-muted ring-1 ring-azzurro-line">
                  Shared today
                </span>
              )}
            </div>
            {brief?.day && (
              <p className="mt-1 text-[11px] text-azzurro-muted">
                Sydney day {brief.day}
                {brief.at
                  ? ` · generated ${brief.at.slice(11, 16)} UTC`
                  : ""}
                {isDefault ? " · shared for all staff" : ""}
              </p>
            )}
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
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {!isDefault && (
            <button
              type="button"
              title="Spend AI tokens once for this filter set (shared for the rest of the Sydney day)"
              onClick={() => void load({ mode: "ai", force: true })}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-azzurro-navy px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              <Wand2 className={`h-3.5 w-3.5 ${busy ? "animate-pulse" : ""}`} />
              Generate AI brief
            </button>
          )}
          <button
            type="button"
            title="Force a new shared brief for this view (uses AI on default view)"
            onClick={() =>
              void load({
                mode: isDefault ? "ai" : brief?.source === "ai" ? "ai" : "rules",
                force: true,
              })
            }
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-azzurro-navy ring-1 ring-azzurro-line hover:bg-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>
    </section>
  );
}
