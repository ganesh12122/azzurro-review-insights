import { ImportPanel } from "@/components/dashboard/ImportPanel";

export default function ImportPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <header className="azzurro-card overflow-hidden bg-azzurro-navy p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-azzurro-accent">
          Admin · Data
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
          Import reviews
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
          Upload the latest Booking.com export (HTML, CSV, or JSON). We compare
          against existing reviews by id, add only what’s new, and update
          matches — no duplicates.
        </p>
      </header>
      <ImportPanel />
      <section className="azzurro-card p-5 text-sm text-azzurro-muted">
        <h2 className="font-display text-lg font-semibold text-azzurro-navy">
          How to get the file
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-azzurro-ink/80">
          <li>Open the property’s Booking.com reviews page in your browser.</li>
          <li>
            Save page as HTML, or use the sample CSV at{" "}
            <code className="rounded bg-azzurro-mist px-1.5 py-0.5 text-azzurro-navy">
              src/data/sample-reviews.csv
            </code>
            .
          </li>
          <li>Upload here — Insights refresh after a successful merge.</li>
        </ol>
      </section>
    </div>
  );
}
