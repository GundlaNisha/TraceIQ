"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRepositories } from "@/features/repositories/api/queries";
import { useRequirements } from "@/features/requirements/api/queries";
import { useCreateReview } from "../api/queries";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CreateReviewModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [repoId, setRepoId] = useState("");
  const [reqId, setReqId] = useState("");
  const [commitHash, setCommitHash] = useState("");

  const { data: repos } = useRepositories();
  const { data: reqs } = useRequirements();
  const { mutate: createReview, isPending } = useCreateReview();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoId || !commitHash) return;

    createReview(
      {
        repository_id: repoId,
        commit_hash: commitHash,
        requirement_id: reqId === "none" ? undefined : reqId,
      },
      {
        onSuccess: (data) => {
          onClose();
          router.push(`/reviews/${data.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-border/40 shadow-2xl sm:rounded-2xl p-6 sm:max-w-md">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-semibold font-serif tracking-tight">Run AI Pre-Review</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-foreground">Repository</Label>
            <Select value={repoId} onValueChange={(v) => setRepoId(v ?? "")}>
              <SelectTrigger className="bg-white border-border/60 shadow-sm focus:ring-accent/20 h-10">
                <SelectValue placeholder="Select a repository" />
              </SelectTrigger>
              <SelectContent>
                {repos?.map((repo: any) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-foreground">Linked Requirement (Optional)</Label>
            <Select value={reqId} onValueChange={(v) => setReqId(v ?? "")}>
              <SelectTrigger className="bg-white border-border/60 shadow-sm focus:ring-accent/20 h-10">
                <SelectValue placeholder="Select a requirement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {reqs?.map((req: any) => (
                  <SelectItem key={req.id} value={req.id}>
                    {req.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-semibold text-foreground">Commit Hash</Label>
            <Input
              placeholder="e.g. 3a7b9c1..."
              value={commitHash}
              onChange={(e) => setCommitHash(e.target.value)}
              required
              className="bg-white border-border/60 shadow-sm focus-visible:ring-accent/20 h-10"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border/40 mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="border-border/60">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !repoId || !commitHash} className="shadow-sm">
              {isPending ? "Starting..." : "Start Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
