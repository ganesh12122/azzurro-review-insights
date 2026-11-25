import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { connection } from "next/server";

function readSyncState() {
  const reviewsPath = path.join(process.cwd(), "src", "data", "reviews.json");
  const logPath = path.join(process.cwd(), "src", "data", "sync-log.json");

  let lastSync = null;
  let count = 0;
  let updatedAt: string | null = null;

  try {
    const reviews = JSON.parse(fs.readFileSync(reviewsPath, "utf8"));
    lastSync = reviews.lastSync || null;
    count = reviews.count ?? reviews.reviews?.length ?? 0;
    updatedAt = reviews.updatedAt || null;
  } catch {
    /* missing */
  }

  let history: unknown[] = [];
  try {
    const log = JSON.parse(fs.readFileSync(logPath, "utf8"));
    history = Array.isArray(log.history) ? log.history.slice(0, 10) : [];
  } catch {
    /* missing */
  }

  return {
    updatedAt,
    count,
    lastSync,
    history,
    schedule: {
      cadence: "daily",
      cronUtc: "0 13 * * *",
      approxLocal: "00:00 Australia/Sydney (AEDT)",
      workflow: "Daily review sync",
    },
  };
}

export async function GET() {
  await connection();
  return NextResponse.json({ ok: true, ...readSyncState() });
}

/**
 * Sync now:
 * 1) If GITHUB_TOKEN + SYNC_REPO are set → dispatch GitHub Action (production-friendly)
 * 2) Else if ALLOW_LOCAL_SYNC=true or development → run Playwright scrape locally
 */
export async function POST() {
  await connection();

  const token = process.env.GITHUB_TOKEN || process.env.SYNC_DISPATCH_TOKEN;
  const repo =
    process.env.SYNC_REPO ||
    process.env.GITHUB_REPOSITORY ||
    "ganesh12122/azzurro-review-insights";

  if (token) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/daily-review-sync.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ ref: "master", inputs: { pages: "2" } }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        {
          ok: false,
          mode: "github-actions",
          error: `Dispatch failed (${res.status}): ${body}`,
          ...readSyncState(),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "github-actions",
      message:
        "Sync started on GitHub Actions. Dataset will update after the workflow finishes and redeploys.",
      ...readSyncState(),
    });
  }

  const allowLocal =
    process.env.ALLOW_LOCAL_SYNC === "true" ||
    process.env.NODE_ENV === "development";

  if (!allowLocal) {
    return NextResponse.json(
      {
        ok: false,
        mode: "disabled",
        error:
          "Live Sync now is not enabled on this host. Use GitHub Actions (workflow_dispatch) or set GITHUB_TOKEN + SYNC_REPO.",
        ...readSyncState(),
      },
      { status: 403 },
    );
  }

  const result = await runLocalScrape();
  return NextResponse.json({
    ok: result.code === 0 || result.code === 2,
    mode: "local-scrape",
    exitCode: result.code,
    stdoutTail: result.output.slice(-4000),
    ...readSyncState(),
  });
}

function runLocalScrape(): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    // Build path at runtime so the bundler does not try to resolve the script module.
    const scriptPath = path.join("scripts", "scrape-reviews.mjs");
    const child = spawn(process.execPath, [scriptPath, "--pages=1"], {
      cwd: process.cwd(),
      env: { ...process.env, SYNC_TRIGGER: "manual-ui" },
    });

    let output = "";
    child.stdout.on("data", (d) => {
      output += d.toString();
    });
    child.stderr.on("data", (d) => {
      output += d.toString();
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}
