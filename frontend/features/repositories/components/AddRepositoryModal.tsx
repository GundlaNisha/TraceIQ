"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddRepository } from "../api/queries";

const schema = z.object({
  repo_url: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (url) =>
        url.startsWith("https://github.com/") ||
        url.startsWith("https://gitlab.com/"),
      "Only GitHub and GitLab URLs are supported",
    ),
});

type FormData = z.infer<typeof schema>;

export function AddRepositoryModal() {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useAddRepository();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    await mutateAsync(data.repo_url);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors">
        Add Repository
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle>Connect a Repository</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 mt-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repo_url">GitHub or GitLab URL</Label>
            <Input
              id="repo_url"
              placeholder="https://github.com/owner/repo"
              {...register("repo_url")}
            />
            {errors.repo_url && (
              <p className="text-sm text-red-500">{errors.repo_url.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Connecting..." : "Connect"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
