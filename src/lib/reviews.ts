import type { Review, Sentiment } from "@/lib/types";

export function getSentiment(score: number): Sentiment {
  if (score >= 8) return "positive";
  if (score >= 6) return "neutral";
  return "negative";
}

export function average(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function filterByProperty(
  reviews: Review[],
  propertyId: string | "all",
): Review[] {
  if (propertyId === "all") return reviews;
  return reviews.filter((r) => r.propertyId === propertyId);
}
