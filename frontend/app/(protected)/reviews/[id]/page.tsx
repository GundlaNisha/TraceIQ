import { ReviewDashboard } from "@/features/reviews/components/ReviewDashboard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Commit Review</h1>
      <ReviewDashboard reviewId={id} />
    </div>
  );
}
