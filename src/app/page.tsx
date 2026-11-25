import { PROPERTIES } from "@/data/properties";
import { REVIEWS } from "@/data/reviews";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-sky-800">
          Azzurro Hotels
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Booking.com Review Insights
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-slate-600">
          Ops dashboard scaffold is ready. Sample data loaded for{" "}
          {PROPERTIES.length} properties and {REVIEWS.length} reviews. Full
          dashboard builds once the trial timer starts.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {PROPERTIES.map((property) => (
          <li
            key={property.id}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
          >
            <p className="font-medium text-slate-900">{property.shortName}</p>
            <p className="mt-1 text-slate-500">{property.suburb}</p>
          </li>
        ))}
      </ul>

      <p className="text-sm text-slate-500">
        Stack: Next.js · TypeScript · Tailwind · Recharts · Vercel-ready
      </p>
    </main>
  );
}
