import { PRDraftList } from "@/features/pr-drafts/components/PRDraftList";

export const metadata = {
  title: "PR Drafts | TraceIQ",
};

export default function PRDraftsPage() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          PR Drafts
        </h1>
      </div>
      <PRDraftList />
    </div>
  );
}
