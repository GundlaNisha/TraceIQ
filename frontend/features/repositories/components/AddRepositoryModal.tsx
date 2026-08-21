"use client";

import { useState, useMemo } from "react";
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
import {
  useAddRepository,
  useGithubStatus,
  useAvailableGithubRepos,
  useLinkGithubInstallation,
  AvailableGithubRepo,
} from "../api/queries";
import {
  GitBranch,
  Lock,
  Globe,
  Search,
  ExternalLink,
  Check,
  Plus,
  Loader2,
  Sparkles,
  Settings,
  Link as LinkIcon,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"github" | "manual">("github");
  const [searchQuery, setSearchQuery] = useState("");
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [manualInstId, setManualInstId] = useState("153250411");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: githubStatus, refetch: refetchStatus } = useGithubStatus();
  const {
    data: availableData,
    isLoading: isLoadingRepos,
    refetch: refetchAvailable,
  } = useAvailableGithubRepos(open && !!githubStatus?.connected);
  const { mutateAsync: addRepo, isPending: isManualPending } = useAddRepository();
  const { mutateAsync: linkInst, isPending: isLinking } = useLinkGithubInstallation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const filteredRepos = useMemo(() => {
    if (!availableData?.repositories) return [];
    if (!searchQuery.trim()) return availableData.repositories;
    const q = searchQuery.toLowerCase();
    return availableData.repositories.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)),
    );
  }, [availableData?.repositories, searchQuery]);

  async function handleImportRepo(repo: AvailableGithubRepo) {
    setErrorMessage(null);
    try {
      setImportingUrl(repo.html_url);
      await addRepo(repo.html_url);
      await refetchAvailable();
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import repository";
      console.error("Failed to import repo:", err);
      setErrorMessage(msg);
    } finally {
      setImportingUrl(null);
    }
  }

  async function handleLinkManualInstallation() {
    setErrorMessage(null);
    const id = parseInt(manualInstId.trim(), 10);
    if (!id || isNaN(id)) return;
    try {
      await linkInst(id);
      await refetchStatus();
      await refetchAvailable();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to link installation";
      console.error("Failed to link installation:", err);
      setErrorMessage(msg);
    }
  }

  async function onSubmitManual(data: FormData) {
    setErrorMessage(null);
    try {
      await addRepo(data.repo_url);
      reset();
      setOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect repository";
      console.error("Failed to connect repo:", err);
      setErrorMessage(msg);
    }
  }

  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "traceiq-official";
  const connectUrl = `https://github.com/apps/${appSlug}/installations/new`;
  const settingsUrl =
    githubStatus?.settings_url ||
    (githubStatus?.installation_id
      ? `https://github.com/settings/installations/${githubStatus.installation_id}`
      : connectUrl);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-white px-3.5 py-2 text-xs font-semibold hover:bg-accent/90 transition-colors shadow-sm">
        <Plus className="w-4 h-4" />
        Add Repository
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl">
        <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-gradient-to-b from-slate-50/80 to-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-accent" />
              Import Repository
            </DialogTitle>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("github")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "github"
                  ? "bg-accent text-white shadow-sm"
                  : "bg-slate-100 text-muted-foreground hover:text-foreground hover:bg-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              1-Click GitHub Import
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "manual"
                  ? "bg-accent text-white shadow-sm"
                  : "bg-slate-100 text-muted-foreground hover:text-foreground hover:bg-slate-200"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Custom / Public URL
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center justify-between gap-2">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: 1-Click GitHub Repositories */}
        {activeTab === "github" && (
          <div className="p-6 flex flex-col gap-4">
            {!githubStatus?.connected ? (
              <div className="flex flex-col gap-4 py-4 px-5 border border-dashed border-border rounded-xl bg-slate-50/60 text-center">
                <GitBranch className="w-10 h-10 text-accent/80 mx-auto" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    Connect Your GitHub Account
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Install TraceIQ on your GitHub account to enable 1-click importing and automated PR reviews.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    className="gap-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold"
                    onClick={() => window.open(connectUrl, "_blank")}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Install TraceIQ on GitHub
                  </Button>
                </div>

                {/* Quick Link Existing Installation */}
                <div className="pt-3 mt-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs">
                  <span className="text-muted-foreground">Already installed on GitHub?</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="Installation ID (e.g. 153250411)"
                      value={manualInstId}
                      onChange={(e) => setManualInstId(e.target.value)}
                      className="h-8 text-xs w-44 bg-white"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLinking || !manualInstId.trim()}
                      onClick={handleLinkManualInstallation}
                      className="h-8 text-xs font-semibold gap-1"
                    >
                      {isLinking ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LinkIcon className="w-3 h-3" />
                      )}
                      Link Installation
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Friction-Removal Pro-Tip Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-50/90 border border-indigo-100 text-xs text-indigo-950">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-base leading-none shrink-0 mt-0.5">💡</span>
                    <div className="min-w-0">
                      <p className="font-bold text-indigo-900 leading-snug">
                        Can't find a repository or tired of 2FA prompts?
                      </p>
                      <p className="text-indigo-800/90 mt-0.5 leading-relaxed">
                        Switch your GitHub App to <span className="font-semibold">"All repositories"</span> on GitHub to grant instant access to all current and future repos without 2FA repetition.
                      </p>
                    </div>
                  </div>
                  <a
                    href={settingsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-sm self-start sm:self-center"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configure Access</span>
                    <ExternalLink className="w-3 h-3 opacity-70" />
                  </a>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search your GitHub repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs bg-slate-50/70 border-border/70 h-9"
                  />
                </div>

                {/* Repository List */}
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {isLoadingRepos ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                      Loading accessible repositories...
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      {searchQuery ? "No matching repositories found." : "No repositories granted yet."}
                    </div>
                  ) : (
                    filteredRepos.map((repo) => {
                      const isImporting = importingUrl === repo.html_url;
                      return (
                        <div
                          key={repo.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:border-border hover:bg-slate-50/80 transition-all gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-foreground truncate">
                                {repo.full_name}
                              </span>
                              {repo.private ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <Lock className="w-2.5 h-2.5" />
                                  Private
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Globe className="w-2.5 h-2.5" />
                                  Public
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {repo.description}
                              </p>
                            )}
                          </div>

                          {repo.is_imported ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 shrink-0">
                              <Check className="w-3.5 h-3.5" />
                              Added
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              disabled={isImporting || isManualPending}
                              onClick={() => handleImportRepo(repo)}
                              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0 h-8 px-3 rounded-lg"
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                  Importing...
                                </>
                              ) : (
                                "Import"
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Custom / Public URL Form */}
        {activeTab === "manual" && (
          <form
            onSubmit={handleSubmit(onSubmitManual)}
            className="p-6 flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="repo_url" className="text-xs font-semibold text-foreground">
                Repository HTTPS URL
              </Label>
              <Input
                id="repo_url"
                placeholder="https://github.com/owner/repository"
                className="text-xs h-9 bg-slate-50/70"
                {...register("repo_url")}
              />
              {errors.repo_url && (
                <p className="text-xs text-rose-500">{errors.repo_url.message}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Paste any public or private GitHub repository URL. If private, ensure TraceIQ is installed on your account.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isManualPending}
                className="bg-accent text-white hover:bg-accent/90 text-xs font-semibold"
              >
                {isManualPending ? "Connecting..." : "Connect Repository"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
