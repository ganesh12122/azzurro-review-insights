import { NextResponse } from "next/server";
import { generateReply, type ReplyInput } from "@/lib/ai/reply";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "POST a review payload to draft a Booking.com reply.",
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReplyInput;
    if (!body || typeof body.text !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid reply payload." },
        { status: 400 },
      );
    }
    const result = await generateReply(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Reply draft failed.",
      },
      { status: 500 },
    );
  }
}
