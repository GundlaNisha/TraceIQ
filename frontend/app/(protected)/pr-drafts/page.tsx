import { PRDraftList } from "@/features/pr-drafts/components/PRDraftList";

export const metadata = {
  title: "PR Drafts | TraceIQ",
};

export default function PRDraftsPage() {
  return (
    <div className="flex flex-col gap-10 pb-12 w-full">
      <header className="mb-2">
        <h1 className="text-4xl font-semibold font-serif text-foreground tracking-tight">PR Drafts</h1>
        <p className="text-lg text-muted mt-2">
          AI-generated pull request descriptions ready for GitHub.
        </p>
      </header>
      <PRDraftList />
    </div>
  );
}
