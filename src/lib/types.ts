export type PropertyId =
  | "darling-harbour"
  | "central-sydney"
  | "potts-point"
  | "surry-hills";

export type Sentiment = "positive" | "neutral" | "negative";

export type TravelerType =
  | "solo"
  | "couple"
  | "group"
  | "business"
  | "family";

export interface Property {
  id: PropertyId;
  name: string;
  shortName: string;
  address: string;
  suburb: string;
}

/** Booking.com-style category subscores (1–10). */
export interface CategoryScores {
  staff: number;
  cleanliness: number;
  location: number;
  facilities: number;
  comfort: number;
  value: number;
}

export interface Review {
  id: string;
  propertyId: PropertyId;
  guestName: string;
  guestCountry: string;
  travelerType: TravelerType;
  stayDate: string; // ISO date
  reviewDate: string; // ISO date
  overallScore: number; // 1–10
  categories?: Partial<CategoryScores>;
  title: string;
  pros: string;
  cons: string;
  replied: boolean;
  replyText?: string;
  tags: string[];
}

export interface ActionItem {
  id: string;
  priority: "urgent" | "high" | "medium" | "low";
  propertyId: PropertyId | "all";
  issue: string;
  recommendedFix: string;
  theme: string;
}

export interface InsightsPayload {
  praise: string[];
  painPoints: string[];
  actionItems: ActionItem[];
  summary: string;
  source: "llm" | "fallback";
}
