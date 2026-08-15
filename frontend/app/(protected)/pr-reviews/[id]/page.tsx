import { PRReviewDetail } from "@/features/pr-reviews/components/PRReviewDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PRReviewDetailPage({ params }: Props) {
  const { id } = await params;
  return <PRReviewDetail reviewId={id} />;
}
