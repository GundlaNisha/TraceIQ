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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run AI Pre-Review</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Repository</Label>
            <Select value={repoId} onValueChange={(v) => setRepoId(v ?? "")}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Linked Requirement (Optional)</Label>
            <Select value={reqId} onValueChange={(v) => setReqId(v ?? "")}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Commit Hash</Label>
            <Input
              placeholder="e.g. 3a7b9c1..."
              value={commitHash}
              onChange={(e) => setCommitHash(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !repoId || !commitHash}>
              {isPending ? "Starting..." : "Start Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
