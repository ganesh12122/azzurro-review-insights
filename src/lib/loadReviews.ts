import type { Review } from "@/lib/types";
import { classifyTopics, sentimentFromScore } from "@/lib/topics";
import reviewsJson from "@/data/reviews.json";

type JsonShape =
  | Review[]
  | {
      reviews?: Review[];
      updatedAt?: string;
      count?: number;
    };

function normalize(r: Partial<Review> & { id: string; propertyId: Review["propertyId"] }): Review {
  const text = r.text || [r.title, r.pros, r.cons].filter(Boolean).join(" ");
  const overallScore = Number(r.overallScore) || 0;
  return {
    id: r.id,
    propertyId: r.propertyId,
    guestName: r.guestName || "Guest",
    guestCountry: r.guestCountry || "",
    reviewDate: r.reviewDate || new Date().toISOString().slice(0, 10),
    stayDate: r.stayDate,
    overallScore,
    title: r.title || "Guest review",
    pros: r.pros || "",
    cons: r.cons || "",
    text,
    topics: r.topics?.length ? r.topics : classifyTopics(text),
    sentiment: r.sentiment || sentimentFromScore(overallScore),
    scrapedAt: r.scrapedAt || new Date().toISOString(),
    sourceUrl: r.sourceUrl || "",
  };
}

export function loadReviews(): Review[] {
  const data = reviewsJson as JsonShape;
  const list = Array.isArray(data) ? data : data.reviews || [];
  return list.map((r) => normalize(r));
}

export function datasetMeta() {
  const data = reviewsJson as JsonShape;
  if (Array.isArray(data)) {
    return { updatedAt: null as string | null, count: data.length };
  }
  return {
    updatedAt: data.updatedAt || null,
    count: data.count ?? data.reviews?.length ?? 0,
  };
}
