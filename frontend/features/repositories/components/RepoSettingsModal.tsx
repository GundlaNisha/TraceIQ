"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUpdateRepoSettings } from "../api/queries";
import { useRequirements } from "@/features/requirements/api/queries";
import type { Repository, Requirement } from "@/lib/types/api";
import { Settings, Sparkles, MessageSquare, Target, Check, Loader2, AlertCircle } from "lucide-react";

interface RepoSettingsModalProps {
  repo: Repository | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RepoSettingsModal({ repo, isOpen, onClose }: RepoSettingsModalProps) {
  const [autoReview, setAutoReview] = useState(false);
  const [autoPost, setAutoPost] = useState(false);
  const [defaultReqId, setDefaultReqId] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: requirements = [] } = useRequirements();
  const { mutate: updateSettings, isPending, isError } = useUpdateRepoSettings();

  // Filter requirements belonging to this repository
  const repoRequirements = requirements.filter(
    (req: Requirement) => req.repository_id === repo?.id
  );

  useEffect(() => {
    if (repo) {
      setAutoReview(Boolean(repo.auto_review_prs));
      setAutoPost(Boolean(repo.auto_post_comments));
      setDefaultReqId(repo.default_requirement_id || "");
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
        },
      },
      {
        onSuccess: () => {
          setSaveSuccess(true);
          setTimeout(() => {
            setSaveSuccess(false);
            onClose();
          }, 900);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl border border-border/60 shadow-xl">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-serif font-bold text-foreground">
                Repository Automation Settings
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure autonomous AI code reviews and GitHub commenting for <span className="font-semibold text-foreground">{repo.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Toggle 1: Auto-Review */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/80 border border-border/50 hover:bg-slate-50 transition-colors">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <label htmlFor="toggle-auto-review" className="text-sm font-semibold text-foreground cursor-pointer block">
                  Automated AI PR Reviews
                </label>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Automatically triggers AI requirement checks and blast radius analysis whenever a PR is opened or new commits are pushed via GitHub Webhook.
                </p>
              </div>
            </div>
            <button
              id="toggle-auto-review"
              type="button"
              role="switch"
              aria-checked={autoReview}
              onClick={() => setAutoReview(!autoReview)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                autoReview ? "bg-accent" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoReview ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Auto-Post Comments */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50/80 border border-border/50 hover:bg-slate-50 transition-colors">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <label htmlFor="toggle-auto-post" className="text-sm font-semibold text-foreground cursor-pointer block">
                  Auto-Post Comments to GitHub
                </label>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Automatically publishes full AI findings and requirement compliance feedback directly to the GitHub PR comment timeline.
                </p>
              </div>
            </div>
            <button
              id="toggle-auto-post"
              type="button"
              role="switch"
              aria-checked={autoPost}
              onClick={() => setAutoPost(!autoPost)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                autoPost ? "bg-accent" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoPost ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Select: Default Benchmark Requirement */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-border/50 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-600" />
              <label htmlFor="default-requirement-select" className="text-sm font-semibold text-foreground">
                Default Benchmark Requirement
              </label>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When webhooks automatically review incoming pull requests, evaluate code against this primary requirement.
            </p>
            <select
              id="default-requirement-select"
              value={defaultReqId}
              onChange={(e) => setDefaultReqId(e.target.value)}
              className="w-full mt-2 px-3 py-2 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            >
              <option value="">(None - General Code Review Only)</option>
              {repoRequirements.map((req: Requirement) => (
                <option key={req.id} value={req.id}>
                  v{req.version_number}: {req.title}
                </option>
              ))}
            </select>
            {repoRequirements.length === 0 && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> No requirements found for this repository yet. Create one in Requirements.
              </p>
            )}
          </div>
        </div>

        {isError && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs border border-rose-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Failed to save settings. Please try again.
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-border/40">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="gap-2 bg-accent text-white hover:bg-accent/90 shadow-sm font-semibold min-w-[110px]"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isPending ? "Saving…" : saveSuccess ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
