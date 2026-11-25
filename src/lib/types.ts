export type PropertyId =
  | "olympic-paddington"
  | "potts-point"
  | "central-sydney"
  | "darling-harbour";

export type Sentiment = "positive" | "neutral" | "negative";

export type TopicId =
  | "cleanliness"
  | "check-in"
  | "staff"
  | "noise"
  | "facilities"
  | "location"
  | "room-condition"
  | "value";

export interface Property {
  id: PropertyId;
  name: string;
  shortName: string;
  bookingSlug: string;
  bookingUrl: string;
  suburb: string;
}

export interface Review {
  id: string;
  propertyId: PropertyId;
  guestName: string;
  guestCountry: string;
  reviewDate: string; // ISO yyyy-mm-dd
  stayDate?: string;
  overallScore: number; // 1–10
  title: string;
  pros: string;
  cons: string;
  text: string;
  topics: TopicId[];
  sentiment: Sentiment;
  scrapedAt: string;
  sourceUrl: string;
}

export interface TopicInsight {
  topic: TopicId;
  label: string;
  mentionCount: number;
  negativeMentionCount: number;
  shareOfNegatives: number; // 0–1 among negative reviews in scope
}
