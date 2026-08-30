"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useWorkspaceStore } from "@/stores/workspace";
import { useRepositories } from "@/features/repositories/api/queries";
import { useCreateRequirement, useUpdateRequirement } from "../api/queries";
import { useJiraConfig, useJiraIssueDetail } from "@/features/jira/api/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Requirement } from "@/lib/types/api";
import { Zap, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  text: z.string().min(10, "Requirement text must be at least 10 characters"),
  repository_id: z.string().min(1, "Select a repository"),
  jira_issue_key: z.string().optional(),
  jira_issue_url: z.string().optional(),
  jira_status: z.string().optional(),
  jira_priority: z.string().optional(),
  jira_issue_type: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initialData?: Requirement;
  preselectedRepoId?: string | null;
  onSuccess?: () => void;
}

export function RequirementForm({ initialData, preselectedRepoId, onSuccess }: Props) {
  const { activeWorkspaceId, activeRepositoryId } = useWorkspaceStore();
  const { data: repos } = useRepositories();
  const { data: jiraConfig } = useJiraConfig(activeWorkspaceId);
  const { mutateAsync: createReq, isPending: isCreating } = useCreateRequirement();
  const { mutateAsync: updateReq, isPending: isUpdating } = useUpdateRequirement();

  // Jira quick autofill state
  const [jiraKeyInput, setJiraKeyInput] = useState("");
  const [fetchingKey, setFetchingKey] = useState<string | null>(null);
  const [jiraFetchError, setJiraFetchError] = useState<string | null>(null);
  const [jiraFetchSuccess, setJiraFetchSuccess] = useState<string | null>(null);

  const { data: fetchedJiraIssue, isLoading: isFetchingJira } = useJiraIssueDetail(
    fetchingKey,
    activeWorkspaceId
  );

  const isPending = isCreating || isUpdating;
  const defaultRepoId = initialData?.repository_id ?? preselectedRepoId ?? activeRepositoryId ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      repository_id: defaultRepoId,
      title: initialData?.title ?? "",
      text: initialData?.text ?? "",
      jira_issue_key: initialData?.jira_issue_key ?? "",
      jira_issue_url: initialData?.jira_issue_url ?? "",
      jira_status: initialData?.jira_status ?? "",
      jira_priority: initialData?.jira_priority ?? "",
      jira_issue_type: initialData?.jira_issue_type ?? "",
    },
  });

  async function handleFetchFromJira() {
    setJiraFetchError(null);
    setJiraFetchSuccess(null);
    let key = jiraKeyInput.trim();
    if (!key) return;
    if (key.includes("/browse/")) {
      key = key.split("/browse/")[1].split("?")[0].trim();
    }
    setFetchingKey(key);
  }

  // When fetched issue arrives, populate form
  if (fetchedJiraIssue && fetchingKey === fetchedJiraIssue.key && !jiraFetchSuccess) {
    setValue("title", `[${fetchedJiraIssue.key}] ${fetchedJiraIssue.summary}`);
    setValue("text", fetchedJiraIssue.description_markdown || fetchedJiraIssue.summary);
    setValue("jira_issue_key", fetchedJiraIssue.key);
    setValue("jira_issue_url", fetchedJiraIssue.url);
    setValue("jira_status", fetchedJiraIssue.status);
    setValue("jira_priority", fetchedJiraIssue.priority);
    setValue("jira_issue_type", fetchedJiraIssue.issue_type);
    setJiraFetchSuccess(`Auto-filled requirement from Jira issue ${fetchedJiraIssue.key}`);
    setFetchingKey(null);
  }

  async function onSubmit(data: FormData) {
    if (initialData) {
      await updateReq({ id: initialData.id, title: data.title, text: data.text });
    } else {
      await createReq(data);
    }
    reset();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Jira Quick Auto-fill Section (Only on create if Jira configured) */}
      {!initialData && jiraConfig?.is_configured && (
        <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Auto-fill from Jira Issue
            </span>
            <span className="text-[10px] text-blue-600 font-medium">
              Connected: {jiraConfig.jira_domain}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter issue key (e.g. PROJ-123) or Jira URL"
              value={jiraKeyInput}
              onChange={(e) => setJiraKeyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleFetchFromJira();
                }
              }}
              className="text-xs bg-white h-8 font-mono"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isFetchingJira || !jiraKeyInput.trim()}
              onClick={handleFetchFromJira}
              className="h-8 text-xs font-semibold text-blue-700 border-blue-300 hover:bg-blue-100/70"
            >
              {isFetchingJira ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  Fetching...
                </>
              ) : (
                "Fetch"
              )}
            </Button>
          </div>

          {jiraFetchSuccess && (
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {jiraFetchSuccess}
            </div>
          )}

          {jiraFetchError && (
            <div className="text-[11px] text-rose-700 font-medium flex items-center gap-1 mt-0.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              {jiraFetchError}
            </div>
          )}
        </div>
      )}

      {/* Linked Jira badge if initialData has Jira */}
      {initialData?.jira_issue_key && (
        <div className="flex items-center justify-between p-2.5 bg-blue-50/50 border border-blue-200/50 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-blue-900">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            Linked Jira: <span className="font-mono text-accent">{initialData.jira_issue_key}</span>
            {initialData.jira_status && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 ml-1">
                {initialData.jira_status}
              </span>
            )}
          </div>
          {initialData.jira_issue_url && (
            <a
              href={initialData.jira_issue_url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Open in Jira <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

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
        <Label htmlFor="text">Requirement (Markdown)</Label>
        <textarea
          id="text"
          rows={6}
          placeholder="Describe the requirement in plain English or Markdown..."
          {...register("text")}
          className="border rounded-lg px-3 py-2 text-sm font-mono resize-none"
        />
        {errors.text && (
          <p className="text-sm text-red-500">{errors.text.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="bg-accent text-white hover:bg-accent/90">
        {isPending ? "Saving..." : initialData ? "Update Requirement" : "Create Requirement"}
      </Button>
    </form>
  );
}
