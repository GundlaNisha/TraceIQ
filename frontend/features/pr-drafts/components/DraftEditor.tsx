"use client";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { usePRDraft, useUpdatePRDraft } from "../api/queries";
import { Button } from "@/components/ui/button";

interface Props {
  draftId: string;
}

export function DraftEditor({ draftId }: Props) {
  const { data: draft, isLoading } = usePRDraft(draftId);
  const { mutateAsync: saveDraft, isPending: isSaving } = useUpdatePRDraft();
  const [content, setContent] = useState("");
  const [savedStatus, setSavedStatus] = useState<"saved" | "unsaved" | null>(
    null,
  );

  // Initialise editor content when the draft loads
  useEffect(() => {
    if (draft?.description_markdown) {
      setContent(draft.description_markdown);
    }
  }, [draft?.description_markdown]);

  async function handleSave() {
    await saveDraft({ id: draftId, description_markdown: content });
    setSavedStatus("saved");
    setTimeout(() => setSavedStatus(null), 3000);
  }

  if (isLoading)
    return (
      <div className="text-sm text-gray-400 py-12 text-center">
        Loading draft...
      </div>
    );
  if (!draft)
    return (
      <div className="text-sm text-red-500 py-12 text-center">
        Draft not found.
      </div>
    );
    
  if (draft.status === "queued")
    return (
      <div className="flex flex-col items-center gap-6 py-16 max-w-md mx-auto">
        <div className="text-gray-700 font-medium">Generating PR Draft...</div>
        <p className="text-xs text-gray-400 text-center">
          TraceIQ is writing a comprehensive PR description based on the impact analysis. This usually takes 15–30 seconds.
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-10rem)]">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700 truncate max-w-lg">
            {draft.title}
          </h2>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              draft.status === "edited"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {draft.status === "edited" ? "Edited" : "AI Generated"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {savedStatus === "saved" && (
            <span className="text-xs text-green-600 font-medium">Saved ✓</span>
          )}
          {content !== draft.description_markdown &&
            savedStatus !== "saved" && (
              <span className="text-xs text-gray-400">Unsaved changes</span>
            )}
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: editor */}
        <div className="flex-1 flex flex-col">
          <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">
            Editor
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full border rounded-lg p-4 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            placeholder="PR description markdown..."
            spellCheck={false}
          />
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-200 self-stretch" />

        {/* Right: preview */}
        {/* 
          IMPORTANT: react-markdown's default renderer does NOT execute arbitrary HTML.
          Do NOT add the rehype-raw plugin — it would allow <script> tags from AI output.
          This is intentional security hardening per the project spec.
        */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="text-xs font-medium text-gray-500 mb-1.5 px-1">
            Preview
          </div>
          <div className="flex-1 overflow-auto border rounded-lg p-4 bg-white">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
