"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

export function ImportPanel() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMessage(null);
    setErrors([]);

    const body = new FormData();
    Array.from(files).forEach((f) => body.append("files", f));

    try {
      const res = await fetch("/api/reviews/import", { method: "POST", body });
      const data = await res.json();
      if (data.ok) {
        setMessage(
          data.message ||
            `Imported ${data.imported} reviews (${data.newReviews} new).`,
        );
        window.setTimeout(() => window.location.assign("/"), 1200);
      } else {
        setMessage(data.error || data.message || "Import failed.");
      }
      if (Array.isArray(data.fileErrors)) setErrors(data.fileErrors);
    } catch {
      setMessage("Upload request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Upload file</h2>
          <p className="mt-1 text-sm text-slate-600">
            Accepts <code className="rounded bg-slate-100 px-1">.html</code>,{" "}
            <code className="rounded bg-slate-100 px-1">.csv</code>,{" "}
            <code className="rounded bg-slate-100 px-1">.json</code>. New
            reviews are added; existing ids are updated — duplicates skipped.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-sky-800 px-3 py-2 text-sm font-medium text-white hover:bg-sky-900">
          <Upload className="h-4 w-4" />
          {busy ? "Importing…" : "Choose files"}
          <input
            type="file"
            className="hidden"
            accept=".html,.htm,.json,.csv"
            multiple
            disabled={busy}
            onChange={(e) => void onUpload(e.target.files)}
          />
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        CSV headers: propertyId, reviewDate, overallScore, title, pros, cons,
        guestName, guestCountry
      </p>
      {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}
      {!!errors.length && (
        <ul className="mt-2 list-disc pl-5 text-xs text-amber-900">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
