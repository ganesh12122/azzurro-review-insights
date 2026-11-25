"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type SyncState = {
  updatedAt: string | null;
  count: number;
  lastSync: {
    at: string;
    trigger: string;
    status: string;
    collected?: number;
    newReviews?: number;
    mergedTotal?: number;
    errors?: string[];
    note?: string;
  } | null;
  schedule?: {
    cadence: string;
    cronUtc: string;
    approxLocal: string;
    workflow: string;
  };
  message?: string;
  mode?: string;
  error?: string;
};

export function SyncPanel() {
  const [state, setState] = useState<SyncState | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      const data = (await res.json()) as SyncState;
      setState(data);
    } catch {
      setFlash("Could not load sync status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function syncNow() {
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = (await res.json()) as SyncState & { ok?: boolean };
      setState(data);
      if (data.ok) {
        setFlash(
          data.message ||
            `Sync finished (${data.mode || "local"}). Status: ${data.lastSync?.status || "unknown"}.`,
        );
        // Reload page data so KPIs pick up new reviews.json after local sync
        if (data.mode === "local-scrape") {
          window.setTimeout(() => window.location.reload(), 1200);
        }
      } else {
        setFlash(data.error || "Sync could not start.");
      }
    } catch {
      setFlash("Sync request failed.");
    } finally {
      setBusy(false);
    }
  }

  const last = state?.lastSync;
  const statusLabel =
    last?.status === "blocked"
      ? "Blocked (Booking.com)"
      : last?.status === "ok"
        ? "OK"
        : last?.status === "partial"
          ? "Partial"
          : last?.status === "failed"
            ? "Failed"
            : last?.status || "—";
  const statusColor =
    last?.status === "ok"
      ? "text-emerald-700"
      : last?.status === "partial" || last?.status === "blocked"
        ? "text-amber-700"
        : last?.status === "failed"
          ? "text-red-700"
          : "text-slate-600";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Auto scrape (best-effort)
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Tries Playwright scrape + daily GitHub Action. Often blocked by
            Booking.com WAF from cloud/datacenter IPs — that is expected. Prefer
            the green <strong>Reliable import</strong> panel above for guaranteed
            updates. Sync now still records status honestly (never fake all-clear).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-sky-800 px-3 py-2 text-sm font-medium text-white hover:bg-sky-900 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          {busy ? "Syncing…" : "Sync now"}
        </button>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Last sync
          </dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {last?.at
              ? last.at.slice(0, 19).replace("T", " ") + " UTC"
              : loading
                ? "Loading…"
                : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Status
          </dt>
          <dd className={`mt-0.5 font-medium ${statusColor}`}>
            {statusLabel}
            {last?.trigger ? ` · ${last.trigger}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Reviews in dataset
          </dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {state?.count ?? "—"}
            {typeof last?.newReviews === "number"
              ? ` · +${last.newReviews} last run`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Schedule
          </dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {state?.schedule?.approxLocal || "Daily ~00:00 Sydney"}
          </dd>
        </div>
      </dl>

      {last?.note && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {last.note}
        </p>
      )}
      {!!last?.errors?.length && (
        <p className="mt-2 text-xs text-red-700">
          Last run notes: {last.errors.slice(0, 2).join(" · ")}
          {last.errors.length > 2 ? "…" : ""}
        </p>
      )}
      {flash && (
        <p className="mt-3 text-xs text-slate-600">{flash}</p>
      )}
    </section>
  );
}
