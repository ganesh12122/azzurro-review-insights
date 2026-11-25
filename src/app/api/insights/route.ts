import { NextResponse } from "next/server";
import {
  generateOpsBrief,
  type OpsBriefInput,
} from "@/lib/ai/opsBrief";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "POST a filter summary to generate an Ops Brief.",
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OpsBriefInput;
    if (!body || typeof body.propertyLabel !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid Ops Brief payload." },
        { status: 400 },
      );
    }
    const brief = await generateOpsBrief(body);
    return NextResponse.json({ ok: true, ...brief });
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
