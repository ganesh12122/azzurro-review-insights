import { NextResponse } from "next/server";
import {
  generateOpsBrief,
  type OpsBriefInput,
} from "@/lib/ai/opsBrief";
import {
  getCachedOpsBrief,
  scopeKeyFromFilters,
  setCachedOpsBrief,
  sydneyDay,
  type FilterScope,
} from "@/lib/ai/opsBriefCache";

type InsightsBody = OpsBriefInput & {
  force?: boolean;
  /** auto = AI allowed (default scope); rules = no AI; ai = force AI path */
  mode?: "auto" | "rules" | "ai";
  filterScope?: FilterScope;
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "POST filter summary for Ops Brief. Shared daily cache (Australia/Sydney).",
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InsightsBody;
    if (!body || typeof body.propertyLabel !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid Ops Brief payload." },
        { status: 400 },
      );
    }

    const filterScope: FilterScope = body.filterScope || {
      propertyId: "all",
      from: "",
      to: "",
      sentiment: "all",
      query: "",
    };
    const { scopeKey, isDefault } = scopeKeyFromFilters(filterScope);
    const day = sydneyDay();
    const force = Boolean(body.force);
    const mode = body.mode || "auto";

    if (!force) {
      const cached = getCachedOpsBrief(day, scopeKey);
      if (cached) {
        return NextResponse.json({
          ok: true,
          summary: cached.summary,
          actions: cached.actions,
          source: cached.source,
          cached: true,
          day: cached.day,
          scopeKey,
          isDefault,
          at: cached.at,
        });
      }
    }

    // Custom filters: only spend AI when mode is explicitly "ai" (or force refresh with ai)
    const skipAi =
      mode === "rules" || (mode === "auto" && !isDefault && !force);

    const brief = await generateOpsBrief(body, { skipAi });
    const saved = setCachedOpsBrief(day, scopeKey, brief);

    return NextResponse.json({
      ok: true,
      summary: saved.summary,
      actions: saved.actions,
      source: saved.source,
      cached: false,
      day: saved.day,
      scopeKey,
      isDefault,
      at: saved.at,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Insights failed.",
      },
      { status: 500 },
    );
  }
}
