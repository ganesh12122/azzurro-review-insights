"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type SyncEntry = {
  at: string;
  trigger: string;
  status: string;
  collected?: number;
  newReviews?: number;
  mergedTotal?: number;
  errors?: string[];
  note?: string;
};

type SyncState = {
  count: number;
  lastSync: SyncEntry | null;
  history?: SyncEntry[];
  schedule?: {
    approxLocal: string;
    cronUtc: string;
    cadence: string;
  };
};

function statusLabel(status: string) {
  if (status === "blocked") return "Blocked (Booking.com)";
  if (status === "ok") return "OK";
  if (status === "partial") return "Partial";
  if (status === "failed") return "Failed";
  return status;
}

function statusClass(status: string) {
  if (status === "ok") return "bg-teal-50 text-teal-800";
  if (status === "partial" || status === "blocked")
    return "bg-azzurro-accent-soft text-azzurro-navy";
  if (status === "failed") return "bg-red-50 text-red-800";
  return "bg-azzurro-mist text-azzurro-muted";
}

export function SyncLogsView() {
  const [state, setState] = useState<SyncState | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/sync", { cache: "no-store" });
    const data = (await res.json()) as SyncState;
    setState(data);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runBestEffortSync() {
    setBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      setState(data);
      setFlash(
        data.message ||
          data.error ||
          `Sync finished · ${data.lastSync?.status || "unknown"}`,
      );
      await refresh();
    } catch {
      setFlash("Could not start sync.");
    } finally {
      setBusy(false);
    }
  }

  const history = state?.history || (state?.lastSync ? [state.lastSync] : []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <header className="azzurro-card overflow-hidden bg-azzurro-navy p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-azzurro-accent">
          Admin · System
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
          Sync logs
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
          Automatic collection runs every day at{" "}
          <strong className="text-white">00:00 Australia/Sydney</strong>{" "}
          (best-effort). Prefer Import data for reliable HTML/CSV merges.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="azzurro-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-azzurro-muted">
            Schedule
          </p>
          <p className="font-display mt-1 text-xl font-semibold text-azzurro-navy">
            {state?.schedule?.approxLocal || "00:00 Sydney"}
          </p>
          <p className="mt-1 text-xs text-azzurro-muted">Daily GitHub Action</p>
        </div>
        <div className="azzurro-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-azzurro-muted">
            Reviews in dataset
          </p>
          <p className="font-display mt-1 text-xl font-semibold text-azzurro-navy">
            {state?.count ?? "—"}
          </p>
          <p className="mt-1 text-xs text-azzurro-muted">After last merge</p>
        </div>
        <div className="azzurro-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-azzurro-muted">
            Last status
          </p>
          <p className="font-display mt-1 text-xl font-semibold text-azzurro-navy">
            {state?.lastSync ? statusLabel(state.lastSync.status) : "—"}
          </p>
          <button
            type="button"
            onClick={() => void runBestEffortSync()}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-azzurro-accent hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Running…" : "Run best-effort sync now"}
          </button>
        </div>
      </section>

      {flash && (
        <p className="rounded-xl bg-azzurro-mist px-3 py-2 text-xs text-azzurro-ink">
          {flash}
        </p>
      )}

      <section className="azzurro-card overflow-hidden p-0">
        <div className="border-b border-azzurro-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-azzurro-navy">
            Run history
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-azzurro-mist/60 text-[11px] uppercase tracking-wide text-azzurro-muted">
              <tr>
                <th className="px-4 py-3">When (UTC)</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">New</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr
                  key={row.at + row.trigger}
                  className="border-t border-azzurro-line/70"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-azzurro-ink">
                    {row.at.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3 text-azzurro-muted">{row.trigger}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.newReviews ?? 0}</td>
                  <td className="px-4 py-3">{row.mergedTotal ?? "—"}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-azzurro-muted">
                    {row.note ||
                      (row.errors?.length
                        ? row.errors.slice(0, 1).join("")
                        : "—")}
                  </td>
                </tr>
              ))}
              {!history.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-azzurro-muted"
                  >
                    No sync runs logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
