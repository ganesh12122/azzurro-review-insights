import { aiConfigured, chatCompletion } from "@/lib/ai/client";

export type ReplyInput = {
  propertyName: string;
  guestName: string;
  score: number;
  title: string;
  pros: string;
  cons: string;
  text: string;
};

export type ReplyResult = {
  reply: string;
  source: "ai" | "rules";
};

export function deterministicReply(input: ReplyInput): ReplyResult {
  const name = input.guestName?.trim() || "Guest";
  const first = name.split(/\s+/)[0] || "Guest";

  if (input.score >= 8) {
    return {
      source: "rules",
      reply: `Dear ${first},\n\nThank you for staying with us at ${input.propertyName} and for the lovely feedback. We’re glad parts of your stay worked well, and we’ll keep looking after the details that matter to our guests.\n\nWarm regards,\nAzzurro Hotels team`,
    };
  }

  const issueHint =
    input.cons?.trim() ||
    input.text?.trim().slice(0, 120) ||
    "the points you raised";

  return {
    source: "rules",
    reply: `Dear ${first},\n\nThank you for taking the time to review your stay at ${input.propertyName}. We’re sorry the experience wasn’t up to the standard we aim for, especially regarding ${issueHint.toLowerCase().replace(/\.$/, "")}.\n\nWe’ve shared your comments with the onsite team so we can follow up on cleanliness, check-in, and comfort where needed. If you return, please ask for the duty manager — we’d like the chance to look after you properly.\n\nKind regards,\nAzzurro Hotels team`,
  };
}

export async function generateReply(input: ReplyInput): Promise<ReplyResult> {
  const fallback = deterministicReply(input);
  if (!aiConfigured()) return fallback;

  try {
    const raw = await chatCompletion(
      [
        {
          role: "system",
          content:
            "You write Booking.com manager replies for Azzurro Hotels (Sydney pod hotels). Tone: warm, accountable, concise (120–180 words). No refunds/legal promises. Do not invent facts. Return plain reply text only — no subject line, no markdown fences.",
        },
        {
          role: "user",
          content: `Draft a reply for this guest review:\n${JSON.stringify(input, null, 2)}`,
        },
      ],
      { temperature: 0.45, maxTokens: 400 },
    );
    const reply = raw.replace(/^```[\s\S]*?\n|```$/g, "").trim();
    if (!reply || reply.length < 40) return fallback;
    return { reply, source: "ai" };
  } catch {
    return fallback;
  }
}
