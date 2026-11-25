"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { OpsBriefInput, OpsBriefResult } from "@/lib/ai/opsBrief";

type Props = {
  input: OpsBriefInput;
};

export function OpsBriefPanel({ input }: Props) {
  const [brief, setBrief] = useState<OpsBriefResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
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
      setBrief({
        summary: data.summary,
        actions: data.actions || [],
        source: data.source === "ai" ? "ai" : "rules",
      });
    } catch {
      setError("Could not reach Insights API.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // Refresh when the filter signature changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input)]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-azzurro-accent/20 bg-azzurro-accent-soft/70 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-azzurro-accent p-1.5 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-azzurro-navy">Ops Brief</p>
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
          onClick={() => void load()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-azzurro-navy ring-1 ring-azzurro-line hover:bg-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </section>
  );
}
