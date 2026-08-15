import { PRReviewList } from "@/features/pr-reviews/components/PRReviewList";

export default function PRReviewsPage() {
  return (
    <div className="flex flex-col gap-10 pb-12">
      <header>
        <h1 className="text-4xl font-semibold font-serif text-foreground tracking-tight">PR Reviews</h1>
        <p className="text-muted mt-2 text-lg">
          AI-powered code reviews for your GitHub Pull Requests, checked against your requirements.
        </p>
      </header>
      <PRReviewList />
    </div>
  );
}
