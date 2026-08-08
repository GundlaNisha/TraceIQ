"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RequirementList } from "@/features/requirements/components/RequirementList";
import { RequirementForm } from "@/features/requirements/components/RequirementForm";

export default function RequirementsPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Requirements</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create and manage requirements for impact analysis.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Requirement</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-white p-6 rounded-lg">
            <DialogHeader>
              <DialogTitle>Create Requirement</DialogTitle>
            </DialogHeader>
            <RequirementForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <RequirementList />
    </div>
  );
}
