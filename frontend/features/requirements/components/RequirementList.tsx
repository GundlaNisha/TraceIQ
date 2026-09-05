"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRequirements, useRequirementVersions } from "../api/queries";
import { useTriggerAnalysis } from "@/features/analysis/api/queries";
import { useSyncJiraRequirement } from "@/features/jira/api/queries";
import { type Requirement, type RequirementVersion } from "@/lib/types/api";
import { Button } from "@/components/ui/button";
import { JiraTransitionModal } from "@/features/jira/components/JiraTransitionModal";
import { JiraPostCommentModal } from "@/features/jira/components/JiraPostCommentModal";
import { RequirementForm } from "./RequirementForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteRequirement } from "../api/queries";
import {
  Trash2,
  Edit2,
  Building2,
  FolderGit2,
  RefreshCw,
  ExternalLink,
  Zap,
  Loader2,
  GitBranch,
  MessageSquare,
  Play,
  X,
  Eye,
  Search,
  Copy,
  Check,
  FileText,
  History,
  Sparkles,
} from "lucide-react";
import { formatTimeAgo, formatDateTime } from "@/lib/utils";

interface Props {
  repoId?: string | null;
  isViewer?: boolean;
}

function getStatusBadgeStyle(status?: string | null): string {
  if (!status) return "bg-slate-100 text-slate-700 border-slate-200";
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("closed") || s.includes("resolved")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s.includes("progress") || s.includes("review") || s.includes("testing")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function RequirementList({ repoId, isViewer = false }: Props) {
  const { data: requirements, isLoading } = useRequirements(repoId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"spec" | "history">("spec");
  const [copiedSpec, setCopiedSpec] = useState(false);

  const [editingReq, setEditingReq] = useState<Requirement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Modals state
  const [transitionModalReq, setTransitionModalReq] = useState<Requirement | null>(null);
  const [commentModalReq, setCommentModalReq] = useState<Requirement | null>(null);

  const { data: versions, isLoading: isLoadingVersions } = useRequirementVersions(selectedId);
  const { mutate: triggerAnalysis, isPending: isAnalyzing } = useTriggerAnalysis();
  const { mutate: deleteRequirement, isPending: isDeleting } = useDeleteRequirement();
  const { mutateAsync: syncJira } = useSyncJiraRequirement();
  const router = useRouter();

  // Find currently selected requirement
  const selectedReq = useMemo(() => {
    return requirements?.find((r) => r.id === selectedId) ?? null;
  }, [requirements, selectedId]);

  // Filtered requirements list
  const filteredRequirements = useMemo(() => {
    if (!requirements) return [];
    if (!searchQuery.trim()) return requirements;
    const q = searchQuery.toLowerCase();
    return requirements.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.jira_issue_key && r.jira_issue_key.toLowerCase().includes(q)) ||
        (r.repository_name && r.repository_name.toLowerCase().includes(q))
    );
  }, [requirements, searchQuery]);

  const handleSyncJira = async (e: React.MouseEvent, reqId: string) => {
    e.stopPropagation();
    setSyncingId(reqId);
    try {
      await syncJira({ requirement_id: reqId });
    } catch (err: any) {
      console.error("Failed to sync Jira requirement", err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleCopySpec = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSpec(true);
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <p className="text-sm">Loading engineering requirements...</p>
      </div>
    );
  }

  if (!requirements?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 p-12 text-center bg-white/50 backdrop-blur-sm space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="font-semibold font-serif text-lg text-foreground">No requirements found</h3>
        <p className="text-sm text-muted max-w-md mx-auto">
          Create a new requirement manually or import issues directly from your connected Jira workspace to begin autonomous code impact analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, Jira ticket (e.g. SAM1-4), or repository..."
            className="w-full pl-9.5 pr-8 py-2 text-xs rounded-xl border border-border/60 bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted font-medium">
          <span>
            Showing <strong>{filteredRequirements.length}</strong> of <strong>{requirements.length}</strong> requirement{requirements.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Main Container: Table + Inspector Drawer */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Table View */}
        <div className="flex-1 min-w-0 w-full rounded-2xl border border-border/40 bg-white/90 backdrop-blur-md shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/70 border-b border-border/40">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold text-muted text-xs tracking-wider uppercase">
                    Requirement
                  </th>
                  <th className="text-left px-4 py-3.5 font-semibold text-muted text-xs tracking-wider uppercase w-20">
                    Version
                  </th>
                  <th className="text-left px-4 py-3.5 font-semibold text-muted text-xs tracking-wider uppercase w-36">
                    Updated
                  </th>
                  <th className="px-5 py-3.5 text-right font-semibold text-muted text-xs tracking-wider uppercase whitespace-nowrap min-w-[260px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequirements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-xs text-muted">
                      No requirements match your search query &quot;{searchQuery}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredRequirements.map((req: Requirement) => {
                    const isSelected = selectedId === req.id;
                    const statusColor = getStatusBadgeStyle(req.jira_status);

                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedId(isSelected ? null : req.id)}
                        className={`border-b border-border/40 last:border-0 hover:bg-slate-50/80 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50/40 border-l-4 border-l-blue-600 shadow-2xs"
                            : "border-l-4 border-l-transparent"
                        }`}
                      >
                        {/* Requirement Title & Badges */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground text-sm leading-snug">
                              {req.title}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider">
                                <Eye className="w-3 h-3" />
                                Viewing
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {/* Jira Badge */}
                            {req.jira_issue_key && (
                              <a
                                href={
                                  req.jira_issue_url ||
                                  `https://atlassian.net/browse/${req.jira_issue_key}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-200/80 transition-colors"
                                title="Open issue in Jira"
                              >
                                <Zap className="w-3 h-3 text-blue-600" />
                                <span>Jira: {req.jira_issue_key}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                              </a>
                            )}

                            {/* Jira Status */}
                            {req.jira_status && (
                              <span
                                className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusColor}`}
                              >
                                {req.jira_status}
                              </span>
                            )}

                            {/* Workspace Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                !req.workspace_id
                                  ? "bg-slate-100 text-slate-700 border border-slate-200"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              }`}
                            >
                              <Building2 className="w-3 h-3" />
                              {req.workspace_name || "Personal Workspace"}
                            </span>

                            {/* Repository Badge */}
                            {req.repository_name && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <FolderGit2 className="w-3 h-3 text-slate-400" />
                                {req.repository_name}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Version */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-mono font-semibold border border-slate-200/60">
                            v{req.version_number}
                          </span>
                        </td>

                        {/* Updated */}
                        <td
                          className="px-4 py-4 text-muted text-xs font-medium whitespace-nowrap"
                          title={formatDateTime(req.updated_at)}
                        >
                          {req.updated_at ? formatTimeAgo(req.updated_at) : "Never"}
                        </td>

                        {/* Actions (Always visible) */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {!isViewer ? (
                              <>
                                {/* Primary CTA: Analyze */}
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={isAnalyzing}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerAnalysis(req.id, {
                                      onSuccess: (data) => {
                                        router.push(`/analysis/${data.job_id}`);
                                      },
                                      onError: (error) => {
                                        console.error("Failed to trigger analysis", error);
                                      },
                                    });
                                  }}
                                  className="h-8 px-2.5 text-xs font-semibold gap-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg shadow-2xs transition-all"
                                  title="Run graph-augmented impact blast radius analysis"
                                >
                                  {isAnalyzing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Play className="w-3 h-3 fill-white" />
                                  )}
                                  <span>Analyze</span>
                                </Button>

                                {/* Jira Actions Group (if Jira-linked) */}
                                {req.jira_issue_key && (
                                  <div
                                    className="flex items-center gap-0.5 bg-slate-100/90 p-1 rounded-lg border border-slate-200/70"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={(e) => handleSyncJira(e, req.id)}
                                      disabled={syncingId === req.id}
                                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-all disabled:opacity-50"
                                      title="Sync latest changes from Jira"
                                    >
                                      <RefreshCw
                                        className={`w-3.5 h-3.5 ${
                                          syncingId === req.id ? "animate-spin text-blue-600" : ""
                                        }`}
                                      />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTransitionModalReq(req);
                                      }}
                                      className="p-1.5 text-slate-600 hover:text-violet-600 hover:bg-white rounded-md transition-all"
                                      title="Transition Jira workflow status"
                                    >
                                      <GitBranch className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCommentModalReq(req);
                                      }}
                                      className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-white rounded-md transition-all"
                                      title="Post analysis comment to Jira"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                {/* Management Actions: Edit & Delete */}
                                <div
                                  className="flex items-center gap-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingReq(req);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                                    title="Edit Requirement"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteClick(e, req.id)}
                                    disabled={isDeleting}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Delete Requirement"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-muted font-medium px-2 py-1 bg-slate-100 rounded-lg">
                                Read-only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Requirement Inspector Drawer (Right Side) */}
        {selectedReq && (
          <div className="w-full lg:w-[420px] shrink-0 rounded-2xl border border-border/50 bg-white/95 backdrop-blur-md shadow-sm flex flex-col self-start overflow-hidden transition-all">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border/40 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Requirement Inspector</h3>
                  <p className="text-[11px] text-muted truncate max-w-[260px]">
                    {selectedReq.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-border/40 bg-slate-50/30 px-4 pt-2 gap-4">
              <button
                onClick={() => setActiveTab("spec")}
                className={`pb-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === "spec"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Specification
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`pb-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Version History
                {versions && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full">
                    {versions.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: Active Specification */}
            {activeTab === "spec" && (
              <div className="p-4 space-y-4 max-h-[620px] overflow-y-auto">
                {/* Metadata Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-semibold text-slate-700 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                    v{selectedReq.version_number} (Active)
                  </span>
                  {selectedReq.jira_issue_key && (
                    <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-semibold">
                      {selectedReq.jira_issue_key}
                    </span>
                  )}
                  {selectedReq.jira_status && (
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-md border ${getStatusBadgeStyle(
                        selectedReq.jira_status
                      )}`}
                    >
                      {selectedReq.jira_status}
                    </span>
                  )}
                </div>

                {/* Content Box with Copy Button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span className="font-medium uppercase tracking-wider">Document Text</span>
                    <button
                      type="button"
                      onClick={() => handleCopySpec(selectedReq.text)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors font-sans"
                    >
                      {copiedSpec ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Markdown</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-foreground/90 leading-relaxed bg-slate-50/90 p-3.5 rounded-xl border border-border/50 font-mono whitespace-pre-wrap max-h-[340px] overflow-y-auto shadow-2xs">
                    {selectedReq.text || "No specification content."}
                  </div>
                </div>

                {/* Quick Drawer Actions */}
                {!isViewer && (
                  <div className="pt-2 border-t border-border/40 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        triggerAnalysis(selectedReq.id, {
                          onSuccess: (data) => {
                            router.push(`/analysis/${data.job_id}`);
                          },
                        });
                      }}
                      className="flex-1 text-xs gap-1.5 bg-accent hover:bg-accent/90 text-white font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Run Blast Radius
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingReq(selectedReq)}
                      className="text-xs gap-1.5 text-slate-700"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Spec
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Version History */}
            {activeTab === "history" && (
              <div className="p-4 max-h-[620px] overflow-y-auto space-y-4">
                {isLoadingVersions ? (
                  <div className="text-xs text-muted animate-pulse py-6 text-center flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    Loading version history...
                  </div>
                ) : !versions?.length ? (
                  <div className="text-xs text-muted py-6 text-center bg-slate-50 rounded-xl border border-dashed border-border/60">
                    No previous revisions recorded.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {versions.map((v: RequirementVersion, index: number) => {
                      const isCurrent = v.version_number === selectedReq.version_number;

                      return (
                        <div
                          key={v.id || v.version_number}
                          className={`p-3 rounded-xl border transition-all ${
                            isCurrent
                              ? "bg-blue-50/40 border-blue-200/80 shadow-2xs"
                              : "bg-slate-50/50 border-border/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                  isCurrent
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                v{v.version_number}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-semibold text-blue-700">
                                  Current Active
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted">
                              {formatDateTime(v.created_at)}
                            </span>
                          </div>

                          {v.title && (
                            <p className="text-xs font-semibold text-foreground/80 mt-1 truncate">
                              {v.title}
                            </p>
                          )}

                          <div className="mt-2 text-[11px] text-foreground/80 leading-relaxed bg-white p-2.5 rounded-lg border border-border/50 font-mono whitespace-pre-wrap max-h-[140px] overflow-y-auto">
                            {v.text || "No text content recorded."}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingReq} onOpenChange={(open) => !open && setEditingReq(null)}>
        <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Requirement</DialogTitle>
          </DialogHeader>
          {editingReq && (
            <RequirementForm initialData={editingReq} onSuccess={() => setEditingReq(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete this requirement? This action removes all associated version history and cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2.5 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                if (deleteConfirmId) {
                  deleteRequirement(deleteConfirmId, {
                    onSuccess: () => {
                      if (selectedId === deleteConfirmId) setSelectedId(null);
                      setDeleteConfirmId(null);
                    },
                  });
                }
              }}
              className="text-xs"
            >
              {isDeleting ? "Deleting..." : "Delete Requirement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Jira Status Transition Modal */}
      {transitionModalReq && (
        <JiraTransitionModal
          open={!!transitionModalReq}
          onOpenChange={(open) => !open && setTransitionModalReq(null)}
          requirementId={transitionModalReq.id}
          jiraIssueKey={transitionModalReq.jira_issue_key!}
          currentStatus={transitionModalReq.jira_status}
          onSuccess={() => setTransitionModalReq(null)}
        />
      )}

      {/* Jira Post Comment Modal */}
      {commentModalReq && (
        <JiraPostCommentModal
          open={!!commentModalReq}
          onOpenChange={(open) => !open && setCommentModalReq(null)}
          requirementId={commentModalReq.id}
          requirementTitle={commentModalReq.title}
          jiraIssueKey={commentModalReq.jira_issue_key!}
          onSuccess={() => setCommentModalReq(null)}
        />
      )}
    </div>
  );
}
