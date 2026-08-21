"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RequirementList } from "@/features/requirements/components/RequirementList";
import { RequirementForm } from "@/features/requirements/components/RequirementForm";

export function RequirementsView() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-10 pb-12 w-full">
      <header className="flex items-end justify-between mb-2">
        <div>
          <h1 className="text-4xl font-semibold font-serif text-foreground tracking-tight">Requirements</h1>
          <p className="text-lg text-muted mt-2">
            Create and manage requirements for impact analysis.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-accent text-white px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors shadow-sm">
            New Requirement
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-white p-6 rounded-lg">
            <DialogHeader>
              <DialogTitle>Create Requirement</DialogTitle>
            </DialogHeader>
            <RequirementForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </header>
      <RequirementList />
    </div>
  );
}
