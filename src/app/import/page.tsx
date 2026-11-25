import { ImportPanel } from "@/components/dashboard/ImportPanel";

export default function ImportPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="space-y-1 border-b border-slate-200 pb-4">
        <p className="text-sm font-medium text-sky-800">Admin · Data</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Import reviews
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Upload the latest Booking.com review export (HTML or CSV/JSON). The
          system compares against existing reviews by id, adds only new ones,
          and updates matching records — no duplicates.
        </p>
      </header>
      <ImportPanel />
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">How to get the file</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Open the property’s Booking.com reviews page in your browser.</li>
          <li>
            Save page as HTML, or fill the sample CSV (
            <code className="rounded bg-slate-100 px-1">src/data/sample-reviews.csv</code>
            ).
          </li>
          <li>Upload here. Dashboard Insights refresh after import.</li>
        </ol>
      </section>
    </div>
  );
}
