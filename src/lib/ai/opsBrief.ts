import { aiConfigured, chatCompletion } from "@/lib/ai/client";

export type OpsBriefInput = {
  propertyLabel: string;
  weekAvg: number | null;
  weekDelta: number | null;
  weekCount: number;
  overallAvg: number | null;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  topTopics: Array<{
    label: string;
    mentionCount: number;
    negativeMentionCount: number;
    shareOfNegatives: number;
  }>;
  sampleNegatives: Array<{
    score: number;
    title: string;
    text: string;
    property: string;
  }>;
};

export type OpsBriefResult = {
  summary: string;
  actions: string[];
  source: "ai" | "rules";
};

function parseBriefJson(raw: string): { summary: string; actions: string[] } | null {
  const fenced = raw.match(/\{[\s\S]*\}/);
  if (!fenced) return null;
  try {
    const parsed = JSON.parse(fenced[0]) as {
      summary?: unknown;
      actions?: unknown;
    };
    if (typeof parsed.summary !== "string") return null;
    const actions = Array.isArray(parsed.actions)
      ? parsed.actions.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
      : [];
    if (!actions.length) return null;
    return { summary: parsed.summary.trim(), actions: actions.slice(0, 5) };
  } catch {
    return null;
  }
}

export function deterministicBrief(input: OpsBriefInput): OpsBriefResult {
  const top = input.topTopics[0];
  const deltaText =
    input.weekDelta == null
      ? "not enough week-over-week data yet"
      : input.weekDelta >= 0
        ? `up ${input.weekDelta.toFixed(1)} vs last week`
        : `down ${Math.abs(input.weekDelta).toFixed(1)} vs last week`;

  const summary = top
    ? `${input.propertyLabel}: week avg ${input.weekAvg?.toFixed(1) ?? "—"} (${deltaText}). ${Math.round(top.shareOfNegatives * 100)}% of negatives mention ${top.label.toLowerCase()}.`
    : `${input.propertyLabel}: week avg ${input.weekAvg?.toFixed(1) ?? "—"} (${deltaText}). Not enough negatives to highlight a dominant topic.`;

  const actions: string[] = [];
  if (top && top.negativeMentionCount > 0) {
    actions.push(
      `Prioritise ${top.label.toLowerCase()} checks on the next two shifts (mentioned in ${top.negativeMentionCount} negative reviews).`,
    );
  }
  if (input.weekDelta != null && input.weekDelta < 0) {
    actions.push(
      "Walk through the last 5 negative reviews with the duty manager and note one fix per issue.",
    );
  }
  if (input.negative > 0) {
    actions.push(
      `Reply to unreplied negatives first (${input.negative} negative in this view) — acknowledge the issue and what you’ll fix.`,
    );
  }
  const second = input.topTopics[1];
  if (second && second.negativeMentionCount > 0) {
    actions.push(
      `Secondary watch: ${second.label.toLowerCase()} (${second.negativeMentionCount} negatives).`,
    );
  }
  actions.push(
    "Log tonight’s free-dinner / common-area feedback so recurring guest comments don’t get lost.",
  );

  return {
    summary,
    actions: actions.slice(0, 5),
    source: "rules",
  };
}

export async function generateOpsBrief(
  input: OpsBriefInput,
  opts?: { skipAi?: boolean },
): Promise<OpsBriefResult> {
  const fallback = deterministicBrief(input);
  if (opts?.skipAi || !aiConfigured()) return fallback;

  try {
    const raw = await chatCompletion(
      [
        {
          role: "system",
          content:
            "You are an ops coach for Azzurro Hotels (Sydney pod hotels). Write short, practical guidance for non-technical onsite staff. Reply with JSON only: {\"summary\":\"...\",\"actions\":[\"...\",\"...\"]}. Max 5 actions. No markdown.",
        },
        {
          role: "user",
          content: `Build today's Ops Brief from this filter scope:\n${JSON.stringify(input, null, 2)}`,
        },
      ],
      { temperature: 0.35, maxTokens: 500 },
    );
    const parsed = parseBriefJson(raw);
    if (!parsed) return fallback;
    return { ...parsed, source: "ai" };
  } catch {
    return fallback;
  }
}
