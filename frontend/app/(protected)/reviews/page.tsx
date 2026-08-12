import { ReviewList } from "@/features/reviews/components/ReviewList";

export default function ReviewsPage() {
  return (
    <div className="flex flex-col gap-10 pb-12 w-full">
      <ReviewList />
    </div>
  );
}
