import { DraftEditor } from "@/features/pr-drafts/components/DraftEditor";

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default async function PRDraftPage({ params }: Props) {
  const resolvedParams = await params;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">PR Draft</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review, edit, and copy your AI-generated PR description.
        </p>
      </div>
      <DraftEditor draftId={resolvedParams.id} />
    </div>
  );
}
