"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRepositories } from "@/features/repositories/api/queries";
import { useRequirements } from "@/features/requirements/api/queries";
import { useCreatePRReview } from "../api/queries";
import type { GitHubPullRequest } from "@/lib/types/github";
import { GitPullRequest, Sparkles } from "lucide-react";

interface Props {
  pr: GitHubPullRequest | null;
  onClose: () => void;
}

export function ReviewPRModal({ pr, onClose }: Props) {
  const [requirementId, setRequirementId] = useState<string>("");
  const [repositoryId, setRepositoryId] = useState<string>("");

  const { data: repos } = useRepositories();
  const { data: reqs } = useRequirements();
  const { mutate: createReview, isPending } = useCreatePRReview();
  const router = useRouter();

  type SelectOption = { label: string; value: string };

  // Build items collections for Base UI Select
  const repoItems: SelectOption[] = useMemo(() => {
    return (repos || []).map((repo: any) => ({
      label: repo.name,
      value: repo.id,
    }));
  }, [repos]);

  const reqItems: SelectOption[] = useMemo(() => {
    return [
      { label: "None — code quality only", value: "none" },
      ...(reqs || []).map((req: any) => ({
        label: req.title,
        value: req.id,
      })),
    ];
  }, [reqs]);

  // Automatically select the repo that matches the PR repository_name
  useEffect(() => {
    if (pr && repos?.length) {
      const match = repos.find(
        (r: any) =>
          r.name === pr.repository_name ||
          r.name.endsWith(`/${pr.repository_name}`) ||
          pr.repository_name.endsWith(`/${r.name}`)
      );
      if (match) {
        setRepositoryId(match.id);
      }
    }
  }, [pr, repos]);

  if (!pr) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repositoryId) return;

    createReview(
      {
        repository_id: repositoryId,
        pr_number: pr.number,
        pr_title: pr.title,
        pr_html_url: pr.html_url,
        requirement_id: requirementId && requirementId !== "none" ? requirementId : undefined,
      },
      {
        onSuccess: (data) => {
          onClose();
          router.push(`/pr-reviews/${data.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={!!pr} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-border/40 shadow-2xl sm:rounded-2xl p-6 sm:max-w-lg">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold font-serif tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            AI PR Review
          </DialogTitle>
        </DialogHeader>

        {/* PR Info Card */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-border/40 mb-5">
          <GitPullRequest className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{pr.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{pr.repository_name} · #{pr.number}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Repository selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              TraceIQ Repository <span className="text-rose-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Select the matching TraceIQ repo so we can link the review correctly.
            </p>
            <Select
              items={repoItems}
              value={repositoryId}
              onValueChange={(v) => setRepositoryId(v ?? "")}
            >
              <SelectTrigger className="bg-white border-border/60 h-10 w-full">
                <SelectValue placeholder="Select repository…" />
              </SelectTrigger>
              <SelectContent>
                {repoItems.map((item) => (
                  <SelectItem key={item.value} value={item.value} label={item.label}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Requirement selector */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              Linked Requirement <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Without a requirement, the AI focuses on code quality, bugs, and security only.
            </p>
            <Select
              items={reqItems}
              value={requirementId}
              onValueChange={(v) => setRequirementId(v ?? "")}
            >
              <SelectTrigger className="bg-white border-border/60 h-10 w-full">
                <SelectValue placeholder="Select a requirement…" />
              </SelectTrigger>
              <SelectContent>
                {reqItems.map((item) => (
                  <SelectItem key={item.value} value={item.value} label={item.label}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button type="button" variant="outline" onClick={onClose} className="border-border/60">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !repositoryId}
              className="gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {isPending ? "Starting Review…" : "Start AI Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
