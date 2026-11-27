"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RequirementList } from "@/features/requirements/components/RequirementList";
import { RequirementForm } from "@/features/requirements/components/RequirementForm";
import { useRequirements } from "@/features/requirements/api/queries";
import { JiraImportDialog } from "@/features/jira/components/JiraImportDialog";
import { useJiraConfig, useSyncAllJiraRequirements } from "@/features/jira/api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import { useWorkspaceSummary } from "@/features/workspace/api/queries";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Plus, Zap, CheckCircle2, AlertCircle, X, RefreshCw } from "lucide-react";

export function RequirementsView() {
  const [open, setOpen] = useState(false);
  const [jiraOpen, setJiraOpen] = useState(false);
  const [oauthBanner, setOauthBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const repoId = searchParams.get("repo_id");
  const jiraConnected = searchParams.get("jira_connected");
  const jiraError = searchParams.get("jira_error");

  useEffect(() => {
    if (jiraConnected === "1" || jiraConnected === "true") {
      setOauthBanner({
        type: "success",
        message: "Atlassian Jira connected! Available requirements are fetched below — select what to import.",
      });
      qc.invalidateQueries({ queryKey: ["jira_config"] });
      qc.invalidateQueries({ queryKey: ["jira_projects"] });
      qc.invalidateQueries({ queryKey: ["jira_issues"] });
      setJiraOpen(true);
      const cleanUrl = repoId ? `/requirements?repo_id=${encodeURIComponent(repoId)}` : "/requirements";
      router.replace(cleanUrl);
    } else if (jiraError) {
      setOauthBanner({
        type: "error",
        message: `Jira authorization failed: ${jiraError}`,
      });
      const cleanUrl = repoId ? `/requirements?repo_id=${encodeURIComponent(repoId)}` : "/requirements";
      router.replace(cleanUrl);
    }
  }, [jiraConnected, jiraError, repoId, qc, router]);

  const { activeWorkspaceId, activeWorkspaceName } = useWorkspaceStore();
  const { data: jiraConfig } = useJiraConfig(activeWorkspaceId);
  const { data: requirements } = useRequirements(repoId);
  const { data: summary } = useWorkspaceSummary(activeWorkspaceId || "");
  const isViewer = activeWorkspaceId && summary?.user_role === "viewer";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const hasJiraRequirements = Boolean(requirements?.some((r) => Boolean(r.jira_issue_key)));
  const isJiraReady = Boolean(jiraConfig?.is_configured && hasJiraRequirements);
  const isWebhookActive = jiraConfig?.webhook_status === "active";
  const showJiraSyncControls = mounted && isJiraReady;

  const { mutateAsync: syncAllJira } = useSyncAllJiraRequirements();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const syncInFlightRef = useRef(false);

  const runSyncCheck = useCallback(
    async (opts?: { manual?: boolean; force?: boolean }) => {
      if (!isJiraReady || syncInFlightRef.current) return;
      const isManual = opts?.manual ?? false;
      const force = opts?.force ?? isManual;
      syncInFlightRef.current = true;
      if (isManual) setIsManualSyncing(true);
      try {
        const res = await syncAllJira({
          repo_id: repoId,
          workspace_id: activeWorkspaceId,
          force,
        });
        if (res.updated > 0) {
          await qc.invalidateQueries({ queryKey: ["requirements"] });
          await qc.refetchQueries({ queryKey: ["requirements"] });
          setOauthBanner({
            type: "success",
            message: `Synced ${res.updated} updated requirement${res.updated > 1 ? "s" : ""} from Jira (${res.updated_keys.join(", ")}).`,
          });
        } else if (isManual) {
          setOauthBanner({
            type: "success",
            message: res.message || "All Jira requirements are up-to-date.",
          });
        }
      } catch (err: any) {
        if (isManual) {
          setOauthBanner({
            type: "error",
            message: err?.message || "Failed to sync Jira requirements.",
          });
        }
      } finally {
        syncInFlightRef.current = false;
        if (isManual) setIsManualSyncing(false);
      }
    },
    [isJiraReady, syncAllJira, repoId, activeWorkspaceId, qc]
  );

  // Webhook-first architecture:
  // - When live Jira Cloud webhook is active, Jira pushes edits straight to /api/v1/jira/webhook
  //   (so no external Jira polling loop is needed).
  // - On localhost / manual token without a public webhook URL, fall back to a gentle one-shot
  //   check on mount and when returning to this tab after leaving it (no continuous timer).
  useEffect(() => {
    if (!isJiraReady || isWebhookActive) return;

    runSyncCheck({ manual: false });

    let wasHidden = false;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
      } else if (wasHidden && document.visibilityState === "visible") {
        wasHidden = false;
        runSyncCheck({ manual: false, force: true });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isJiraReady, isWebhookActive, runSyncCheck]);

  return (
    <div className="flex flex-col gap-8 pb-12 w-full">
      {oauthBanner && (
        <div
          className={`flex items-center justify-between gap-3 p-3.5 rounded-xl text-xs font-medium border ${
            oauthBanner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {oauthBanner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{oauthBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setOauthBanner(null)}
            className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
            {showJiraSyncControls && (
              <Button
                type="button"
                variant="outline"
                disabled={isManualSyncing}
                onClick={() => runSyncCheck({ manual: true })}
                className={`inline-flex items-center gap-1.5 justify-center rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all shadow-2xs ${
                  isWebhookActive
                    ? "border-emerald-200/80 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-700"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
                title={
                  isWebhookActive
                    ? "Real-time Jira Cloud webhook is active — updates sync automatically. Click to force sync now."
                    : "Localhost fallback: syncs automatically when returning to this tab (no continuous polling). Set PUBLIC_BACKEND_URL (e.g. ngrok) for real-time Jira webhooks."
                }
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isWebhookActive ? "text-emerald-600" : "text-slate-600"
                  } ${isManualSyncing ? "animate-spin" : ""}`}
                />
                {isManualSyncing
                  ? "Syncing..."
                  : isWebhookActive
                    ? "Webhook Sync Active"
                    : "Sync Jira"}
              </Button>
            )}
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

      <RequirementList
        repoId={repoId}
        isViewer={Boolean(isViewer)}
        isJiraConfigured={Boolean(jiraConfig?.is_configured)}
        onOpenJiraImport={() => setJiraOpen(true)}
      />
    </div>
  );
}
