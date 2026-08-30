"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RequirementList } from "@/features/requirements/components/RequirementList";
import { RequirementForm } from "@/features/requirements/components/RequirementForm";
import { JiraImportDialog } from "@/features/jira/components/JiraImportDialog";
import { useWorkspaceStore } from "@/stores/workspace";
import { useWorkspaceSummary } from "@/features/workspace/api/queries";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Plus, Zap } from "lucide-react";

export function RequirementsView() {
  const [open, setOpen] = useState(false);
  const [jiraOpen, setJiraOpen] = useState(false);
  const searchParams = useSearchParams();
  const repoId = searchParams.get("repo_id");

  const { activeWorkspaceId, activeWorkspaceName } = useWorkspaceStore();
  const { data: summary } = useWorkspaceSummary(activeWorkspaceId || "");
  const isViewer = activeWorkspaceId && summary?.user_role === "viewer";

  return (
    <div className="flex flex-col gap-8 pb-12 w-full">
      {isViewer && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 font-medium">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            You have <strong>Viewer</strong> access in <strong>{activeWorkspaceName || "this workspace"}</strong>. You can view all requirements and run reports in read-only mode.
          </span>
        </div>
      )}

      <header className="flex items-end justify-between mb-2">
        <div>
          <h1 className="text-4xl font-semibold font-serif text-foreground tracking-tight">Requirements</h1>
          <p className="text-lg text-muted mt-2">
            Create and manage requirements for impact analysis.
          </p>
        </div>
        {!isViewer && (
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setJiraOpen(true)}
              className="inline-flex items-center gap-1.5 justify-center rounded-xl border border-blue-200/80 bg-blue-50/50 hover:bg-blue-100/70 text-blue-700 px-4 py-2.5 text-sm font-semibold transition-all shadow-2xs"
            >
              <Zap className="w-4 h-4 text-blue-600" />
              Import from Jira
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger className="inline-flex items-center gap-1.5 justify-center rounded-xl bg-accent text-white px-4 py-2.5 text-sm font-semibold hover:bg-accent/90 transition-all shadow-sm">
                <Plus className="w-4 h-4" />
                New Requirement
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Create Requirement</DialogTitle>
                </DialogHeader>
                <RequirementForm
                  preselectedRepoId={repoId}
                  onSuccess={() => setOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </header>

      {/* Jira Import Dialog */}
      <JiraImportDialog
        open={jiraOpen}
        onOpenChange={setJiraOpen}
        preselectedRepoId={repoId}
      />

      <RequirementList repoId={repoId} isViewer={Boolean(isViewer)} />
    </div>
  );
}
