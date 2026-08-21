import { PRReviewDetail } from "@/features/pr-reviews/components/PRReviewDetail";

export const metadata = {
  title: "PR Review Report",
  description: "Detailed AI code review findings, requirement gap breakdown, and line annotations.",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PRReviewDetailPage({ params }: Props) {
  const { id } = await params;
  return <PRReviewDetail reviewId={id} />;
}
