"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useWorkspaceStore } from "@/stores/workspace";
import { useRepositories } from "@/features/repositories/api/queries";
import { useCreateRequirement } from "../api/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  text: z.string().min(10, "Requirement text must be at least 10 characters"),
  repository_id: z.string().min(1, "Select a repository"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onSuccess?: () => void;
}

export function RequirementForm({ onSuccess }: Props) {
  const { activeRepositoryId } = useWorkspaceStore();
  const { data: repos } = useRepositories();
  const { mutateAsync, isPending } = useCreateRequirement();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { repository_id: activeRepositoryId ?? "" },
  });

  async function onSubmit(data: FormData) {
    await mutateAsync(data);
    reset();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Add idempotency key to charge API"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="repository_id">Repository</Label>
        <select
          id="repository_id"
          {...register("repository_id")}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Select repository...</option>
          {repos?.map((r: { id: string; name: string }) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {errors.repository_id && (
          <p className="text-sm text-red-500">{errors.repository_id.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="text">Requirement</Label>
        <textarea
          id="text"
          rows={5}
          placeholder="Describe the requirement in plain English..."
          {...register("text")}
          className="border rounded-lg px-3 py-2 text-sm resize-none"
        />
        {errors.text && (
          <p className="text-sm text-red-500">{errors.text.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Create Requirement"}
      </Button>
    </form>
  );
}
