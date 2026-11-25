import type { TopicId } from "@/lib/types";

export const TOPIC_LABELS: Record<TopicId, string> = {
  cleanliness: "Cleanliness",
  "check-in": "Check-in experience",
  staff: "Staff / receptionist",
  noise: "Noise",
  facilities: "Facilities",
  location: "Location",
  "room-condition": "Room condition",
  value: "Value for money",
};

/** Keyword / phrase rules for operational topic tagging. */
export const TOPIC_RULES: Record<TopicId, RegExp[]> = {
  cleanliness: [
    /\bclean(?:liness|ing|ed|er)?\b/i,
    /\bdirty\b/i,
    /\bdust(?:y)?\b/i,
    /\bstain(?:s|ed)?\b/i,
    /\bmould\b|\bmold\b/i,
    /\bsmell(?:s|ed|y)?\b/i,
    /\bhygiene\b/i,
    /\bbathroom(?:s)?\s+(?:dirty|filthy|unclean)\b/i,
  ],
  "check-in": [
    /\bcheck[-\s]?in\b/i,
    /\bdoor\s*code\b/i,
    /\baccess\s*code\b/i,
    /\bkey(?:card)?\b/i,
    /\breception\b/i,
    /\blate\s+arrival\b/i,
  ],
  staff: [
    /\bstaff\b/i,
    /\breceptionist\b/i,
    /\bfront\s*desk\b/i,
    /\bfriendly\b/i,
    /\bhelpful\b/i,
    /\brude\b/i,
    /\bhost\b/i,
  ],
  noise: [
    /\bnoise\b/i,
    /\bnoisy\b/i,
    /\bloud\b/i,
    /\bhallway\b/i,
    /\bsnor(?:e|ing)\b/i,
    /\bthin\s+walls?\b/i,
  ],
  facilities: [
    /\bfacilit(?:y|ies)\b/i,
    /\bkitchen\b/i,
    /\bwifi\b|\bwi-fi\b|\binternet\b/i,
    /\blaundry\b/i,
    /\belevator\b|\blift\b/i,
    /\bair\s*con(?:ditioning)?\b|\bac\b/i,
    /\bshower\b/i,
  ],
  location: [
    /\blocation\b/i,
    /\bcentral\b/i,
    /\bwalk(?:ing)?\s+distance\b/i,
    /\bnear(?:by)?\b/i,
    /\bstation\b/i,
    /\bharbour\b|\bharbor\b/i,
  ],
  "room-condition": [
    /\broom\b/i,
    /\bbed(?:ding)?\b/i,
    /\bmattress\b/i,
    /\bpod\b/i,
    /\bbroken\b/i,
    /\bmaintenance\b/i,
    /\brundown\b|\brun[-\s]?down\b/i,
    /\bcurtain\b/i,
  ],
  value: [
    /\bvalue\b/i,
    /\bprice\b/i,
    /\bcheap\b/i,
    /\bexpensive\b/i,
    /\bworth\b/i,
    /\bmoney\b/i,
    /\bbudget\b/i,
    /\bfree\s+(?:dinner|breakfast|meal)\b/i,
  ],
};

export function classifyTopics(text: string): TopicId[] {
  const hits = (Object.keys(TOPIC_RULES) as TopicId[]).filter((topic) =>
    TOPIC_RULES[topic].some((re) => re.test(text)),
  );
  return hits;
}

export function sentimentFromScore(score: number) {
  if (score >= 8) return "positive" as const;
  if (score >= 6) return "neutral" as const;
  return "negative" as const;
}
