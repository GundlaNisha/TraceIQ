"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateRepoSettings } from "../api/queries";
import { useRequirements } from "@/features/requirements/api/queries";
import { useWorkspaces } from "@/features/workspace/api/queries";
import type { Repository, Requirement } from "@/lib/types/api";
import {
  Settings,
  Sparkles,
  MessageSquare,
  Target,
  Check,
  Loader2,
  AlertCircle,
  Building2,
  User,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface RepoSettingsModalProps {
  repo: Repository | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RepoSettingsModal({ repo, isOpen, onClose }: RepoSettingsModalProps) {
  // Enabled by default for all repositories
  const [autoReview, setAutoReview] = useState(true);
  const [autoPost, setAutoPost] = useState(true);
  const [defaultReqId, setDefaultReqId] = useState<string>("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: requirements = [] } = useRequirements();
  const { data: workspaces = [] } = useWorkspaces();
  const { mutate: updateSettings, isPending, isError } = useUpdateRepoSettings();

  // Filter requirements belonging to this repository
  const repoRequirements = requirements.filter(
    (req: Requirement) => req.repository_id === repo?.id
  );

  useEffect(() => {
    if (repo) {
      // Default to true unless explicitly disabled (false)
      setAutoReview(repo.auto_review_prs !== false);
      setAutoPost(repo.auto_post_comments !== false);
      setDefaultReqId(repo.default_requirement_id || "");
      setSelectedWorkspaceId(repo.workspace_id || "");
      setSaveSuccess(false);
    }
  }, [repo, isOpen]);

  if (!repo) return null;

  const handleSave = () => {
    updateSettings(
      {
        id: repo.id,
        settings: {
          auto_review_prs: autoReview,
          auto_post_comments: autoPost,
          default_requirement_id: defaultReqId ? defaultReqId : null,
          workspace_id: selectedWorkspaceId ? selectedWorkspaceId : null,
        },
      },
      {
        onSuccess: () => {
          setSaveSuccess(true);
          setTimeout(() => {
            setSaveSuccess(false);
            onClose();
          }, 800);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border border-border/80 shadow-2xl">
        {/* Pinned Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0 bg-white">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Settings className="w-5 h-5 text-slate-100" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                  Repository Automation Settings
                </DialogTitle>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3 text-emerald-600" />
                  Autonomous
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-1 leading-normal truncate">
                Configure autonomous AI code reviews, blast radius analysis, and GitHub comments for{" "}
                <span className="font-semibold text-foreground">{repo.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5 divide-y-0">
          {/* Toggle 1: Auto-Review */}
          <div
            className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
              autoReview
                ? "bg-blue-50/30 border-blue-200/70 shadow-xs"
                : "bg-slate-50/70 border-border/60 hover:bg-slate-50"
            }`}
          >
            <div className="flex gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  autoReview
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="toggle-auto-review"
                    className="text-sm font-semibold text-foreground cursor-pointer select-none"
                  >
                    Automated AI PR Reviews
                  </label>
                  {autoReview && (
                    <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                      Enabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Automatically triggers AI requirement checks and AST blast radius analysis whenever a PR is opened or new commits are pushed via GitHub Webhooks.
                </p>
              </div>
            </div>
            <button
              id="toggle-auto-review"
              type="button"
              role="switch"
              aria-checked={autoReview}
              onClick={() => setAutoReview(!autoReview)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 ${
                autoReview ? "bg-slate-900" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  autoReview ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Auto-Post Comments */}
          <div
            className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
              autoPost
                ? "bg-emerald-50/30 border-emerald-200/70 shadow-xs"
                : "bg-slate-50/70 border-border/60 hover:bg-slate-50"
            }`}
          >
            <div className="flex gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  autoPost
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="toggle-auto-post"
                    className="text-sm font-semibold text-foreground cursor-pointer select-none"
                  >
                    Auto-Post Comments to GitHub
                  </label>
                  {autoPost && (
                    <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      Enabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Automatically publishes AI findings, CI correlation, and requirement compliance feedback directly to the GitHub PR timeline and linked Jira tickets.
                </p>
              </div>
            </div>
            <button
              id="toggle-auto-post"
              type="button"
              role="switch"
              aria-checked={autoPost}
              onClick={() => setAutoPost(!autoPost)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 ${
                autoPost ? "bg-slate-900" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  autoPost ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Select: Default Benchmark Requirement */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-border/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <label
                  htmlFor="default-requirement-select"
                  className="text-sm font-semibold text-foreground"
                >
                  Default Benchmark Requirement
                </label>
              </div>
              <span className="text-[10px] font-medium text-slate-500 bg-white border border-border/60 px-2 py-0.5 rounded-full">
                Autonomous Fallback
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              TraceIQ automatically resolves Jira issues &amp; synthesizes PR specs. If no ticket or active requirement is linked, incoming PRs evaluate against this fallback.
            </p>
            <select
              id="default-requirement-select"
              value={defaultReqId}
              onChange={(e) => setDefaultReqId(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 text-sm bg-white border border-border/80 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-foreground transition-all"
            >
              <option value="">(Autonomously Synthesize from PR Title &amp; Spec)</option>
              {repoRequirements.map((req: Requirement) => (
                <option key={req.id} value={req.id}>
                  v{req.version_number}: {req.title} {req.jira_issue_key ? `(${req.jira_issue_key})` : ""}
                </option>
              ))}
            </select>
            {repoRequirements.length === 0 && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Zero manual setup needed — TraceIQ will autonomously generate requirements on the fly.</span>
              </p>
            )}
          </div>

          {/* Workspace Placement & Transfer */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-border/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <label
                  htmlFor="workspace-transfer-select"
                  className="text-sm font-semibold text-foreground"
                >
                  Workspace Location &amp; Access
                </label>
              </div>
              {repo.workspace_name ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full">
                  <Building2 className="w-3 h-3" />
                  {repo.workspace_name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  <User className="w-3 h-3" />
                  Personal Workspace
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Move this repository to a team workspace to share code indexing, requirements, impact analysis, and PR reviews with collaborators.
            </p>
            <select
              id="workspace-transfer-select"
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 text-sm bg-white border border-border/80 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-foreground transition-all"
            >
              <option value="">Personal Workspace (Private to you)</option>
              {workspaces.map((ws: any) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.user_role ? `${ws.user_role.toUpperCase()}` : "Member"})
                </option>
              ))}
            </select>
          </div>

          {isError && (
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs border border-rose-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Failed to save settings. Please try again.
            </div>
          )}
        </div>

        {/* Pinned Footer */}
        <div className="p-4 px-6 border-t border-border/50 bg-slate-50/60 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            Changes apply to all future webhook events.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="h-9 px-4 text-xs font-medium rounded-xl border-border hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="h-9 px-4 text-xs font-semibold rounded-xl gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-sm min-w-[110px]"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {isPending ? "Saving…" : saveSuccess ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
