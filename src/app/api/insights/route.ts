import { NextResponse } from "next/server";

/**
 * Stub — filled during trial with LLM + deterministic fallback.
 * POST body can include propertyId / review subset later.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Insights API ready. Implement during trial build.",
  });
}
