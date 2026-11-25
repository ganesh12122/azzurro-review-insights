import { Dashboard } from "@/components/dashboard/Dashboard";
import { datasetMeta, loadReviews } from "@/lib/loadReviews";

export default function Home() {
  const reviews = loadReviews();
  const meta = datasetMeta();

  return <Dashboard reviews={reviews} updatedAt={meta.updatedAt} />;
}
