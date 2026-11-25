import { connection, NextResponse } from "next/server";
import {
  mergeAndSaveReviews,
  parseReviewsCsv,
  parseReviewsHtml,
  parseReviewsJson,
} from "@/lib/importReviews";

export async function POST(req: Request) {
  await connection();

  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);

    if (!files.length) {
      return NextResponse.json(
        { ok: false, error: "Upload one or more .csv, .json, or .html files." },
        { status: 400 },
      );
    }

    const parsed = [];
    const sourceFiles: string[] = [];
    const fileErrors: string[] = [];

    for (const file of files) {
      const name = file.name || "upload";
      const text = await file.text();
      const lower = name.toLowerCase();
      let batch = [];

      if (lower.endsWith(".json")) {
        batch = parseReviewsJson(text);
      } else if (lower.endsWith(".csv")) {
        batch = parseReviewsCsv(text);
      } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
        batch = parseReviewsHtml(text, name);
      } else {
        fileErrors.push(`${name}: unsupported type (use csv/json/html)`);
        continue;
      }

      if (!batch.length) {
        fileErrors.push(`${name}: 0 reviews parsed`);
      }
      parsed.push(...batch);
      sourceFiles.push(name);
    }

    const lastSync = mergeAndSaveReviews(parsed, {
      trigger: "browser-import",
      sourceFiles,
    });

    return NextResponse.json({
      ok: lastSync.status === "ok",
      imported: parsed.length,
      newReviews: lastSync.newReviews,
      mergedTotal: lastSync.mergedTotal,
      fileErrors,
      lastSync,
      message:
        lastSync.status === "ok"
          ? `Imported ${parsed.length} reviews (${lastSync.newReviews} new). Refresh to update the dashboard.`
          : "Import finished but no reviews were parsed.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Import failed",
      },
      { status: 500 },
    );
  }
}
