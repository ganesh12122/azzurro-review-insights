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
  if (status === "ok") return "bg-emerald-50 text-emerald-800";
  if (status === "partial" || status === "blocked")
    return "bg-amber-50 text-amber-900";
  if (status === "failed") return "bg-red-50 text-red-800";
  return "bg-slate-100 text-slate-700";
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="space-y-1 border-b border-slate-200 pb-4">
        <p className="text-sm font-medium text-sky-800">Admin · System</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Sync logs
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Automatic collection runs every day at{" "}
          <strong>00:00 Australia/Sydney</strong> (best-effort). Results appear
          here. Prefer <em>Import data</em> when you have a fresh HTML/CSV file
          — that path always merges without depending on Booking.com bot checks.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Schedule
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {state?.schedule?.approxLocal || "00:00 Sydney"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Daily GitHub Action</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Reviews in dataset
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {state?.count ?? "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">After last successful merge</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Last status
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {state?.lastSync
              ? statusLabel(state.lastSync.status)
              : "—"}
          </p>
          <button
            type="button"
            onClick={() => void runBestEffortSync()}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-sky-800 hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Running…" : "Run best-effort sync now"}
          </button>
        </div>
      </section>

      {flash && (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700">
          {flash}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Run history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">When (UTC)</th>
                <th className="px-4 py-2">Trigger</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">New</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.at + row.trigger} className="border-t border-slate-100">
                  <td className="px-4 py-2 whitespace-nowrap text-slate-700">
                    {row.at.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{row.trigger}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusClass(row.status)}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2">{row.newReviews ?? 0}</td>
                  <td className="px-4 py-2">{row.mergedTotal ?? "—"}</td>
                  <td className="max-w-xs px-4 py-2 text-xs text-slate-500">
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
                    className="px-4 py-6 text-center text-slate-500"
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
