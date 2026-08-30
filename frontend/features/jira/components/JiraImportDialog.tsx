"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspaceStore } from "@/stores/workspace";
import { useRepositories } from "@/features/repositories/api/queries";
import {
  useJiraConfig,
  useJiraProjects,
  useJiraIssueTypes,
  useJiraStatuses,
  useJiraBoards,
  useJiraSprints,
  useJiraIssues,
  useJiraIssueDetail,
  useImportJiraIssue,
  useBatchImportJiraIssues,
} from "../api/queries";
import { JiraConfigModal } from "./JiraConfigModal";
import type { JiraIssue } from "@/lib/types/api";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Zap,
  FolderGit2,
  Settings,
  FileText,
  Tag,
  Sparkles,
  Kanban,
  CheckSquare,
  ListFilter,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedRepoId?: string | null;
  onSuccess?: () => void;
}

export function JiraImportDialog({ open, onOpenChange, preselectedRepoId, onSuccess }: Props) {
  const { activeWorkspaceId, activeRepositoryId } = useWorkspaceStore();
  const { data: repos } = useRepositories();
  const { data: config, isLoading: configLoading } = useJiraConfig(activeWorkspaceId);

  const isConfigured = Boolean(config?.is_configured);

  // Agile & metadata hooks
  const { data: projects } = useJiraProjects(activeWorkspaceId, isConfigured);
  const { data: issueTypes } = useJiraIssueTypes(activeWorkspaceId, isConfigured);
  const { data: statuses } = useJiraStatuses(activeWorkspaceId, isConfigured);

  // Active target repository
  const [selectedRepoId, setSelectedRepoId] = useState<string>(
    preselectedRepoId || activeRepositoryId || ""
  );

  // Active view tab: "browse" | "quick"
  const [activeTab, setActiveTab] = useState<"browse" | "quick">("browse");

  // Config modal state
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [selectedSprintId, setSelectedSprintId] = useState<string>("");
  const [selectedIssueType, setSelectedIssueType] = useState<string>("");
  const [selectedStatusCategory, setSelectedStatusCategory] = useState<string>("");

  // Boards and Sprints
  const { data: boards } = useJiraBoards(selectedProject || null, activeWorkspaceId, isConfigured);
  const { data: sprints } = useJiraSprints(selectedBoardId || null, activeWorkspaceId, isConfigured);

  // Selected issues for batch import
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Active previewed issue
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const { data: previewDetail, isLoading: previewLoading } = useJiraIssueDetail(
    previewKey,
    activeWorkspaceId
  );

  // Quick fetch state
  const [quickInputKey, setQuickInputKey] = useState("");
  const [quickFetchKey, setQuickFetchKey] = useState<string | null>(null);
  const { data: quickDetail, isLoading: quickLoading, isError: quickError } = useJiraIssueDetail(
    quickFetchKey,
    activeWorkspaceId
  );
  const [quickCustomTitle, setQuickCustomTitle] = useState("");
  const [quickCustomText, setQuickCustomText] = useState("");

  // Mutation hooks
  const { mutateAsync: importSingle, isPending: isImportingSingle } = useImportJiraIssue();
  const { mutateAsync: importBatch, isPending: isImportingBatch } = useBatchImportJiraIssues();

  // Status message state
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Query issues
  const {
    data: searchData,
    isLoading: issuesLoading,
  } = useJiraIssues({
    q: searchQuery,
    project_key: selectedProject || undefined,
    issue_type: selectedIssueType || undefined,
    status_category: selectedStatusCategory || undefined,
    board_id: selectedBoardId || undefined,
    sprint_id: selectedSprintId || undefined,
    workspaceId: activeWorkspaceId,
    enabled: Boolean(isConfigured && open),
  });

  const issues = searchData?.issues || [];

  // Toggle single key in batch selection
  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Toggle all visible keys
  function toggleAllVisible() {
    if (selectedKeys.size >= issues.length && issues.length > 0) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(issues.map((i) => i.key)));
    }
  }

  // Handle single issue import
  async function handleImportSingle(issueKey: string, customTitle?: string, customText?: string) {
    setFeedback(null);
    const repoId = selectedRepoId || activeRepositoryId;
    if (!repoId) {
      setFeedback({ type: "error", message: "Please select a target repository first." });
      return;
    }
    try {
      const res = await importSingle({
        repository_id: repoId,
        issue_key: issueKey,
        custom_title: customTitle,
        custom_text: customText,
        workspace_id: activeWorkspaceId,
      });
      setFeedback({
        type: "success",
        message: `Successfully imported "${res.title}" as a requirement (v${res.version_number}).`,
      });
      onSuccess?.();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || `Failed to import issue ${issueKey}`,
      });
    }
  }

  // Handle batch import
  async function handleImportBatch() {
    setFeedback(null);
    const repoId = selectedRepoId || activeRepositoryId;
    if (!repoId) {
      setFeedback({ type: "error", message: "Please select a target repository first." });
      return;
    }
    const keys = Array.from(selectedKeys);
    if (keys.length === 0) {
      setFeedback({ type: "error", message: "No issues selected for import." });
      return;
    }

    try {
      const res = await importBatch({
        repository_id: repoId,
        issue_keys: keys,
        workspace_id: activeWorkspaceId,
      });
      if (res.total_imported > 0) {
        setFeedback({
          type: "success",
          message: `Successfully imported ${res.total_imported} requirement${res.total_imported > 1 ? "s" : ""}!`,
        });
        setSelectedKeys(new Set());
        onSuccess?.();
      } else if (res.failed.length > 0) {
        setFeedback({
          type: "error",
          message: `Failed to import issues: ${res.failed.map((f) => f.key).join(", ")}`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to batch import Jira issues",
      });
    }
  }

  // Quick fetch handler
  function handleQuickFetch() {
    setFeedback(null);
    let key = quickInputKey.trim();
    if (!key) return;
    if (key.includes("/browse/")) {
      key = key.split("/browse/")[1].split("?")[0].trim();
    }
    setQuickFetchKey(key);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl bg-white p-6 rounded-2xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <DialogHeader className="pb-3 border-b border-border/40 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-serif">Import from Jira</DialogTitle>
                  <DialogDescription className="text-xs text-muted">
                    Fetch engineering requirements, user stories, tasks, To-Dos, and Kanban items directly from Atlassian Jira.
                  </DialogDescription>
                </div>
              </div>

              {isConfigured && (
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-foreground hover:bg-slate-100 transition-colors border border-border/60"
                  title="Configure Jira Connection"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Jira Settings</span>
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Body Content */}
          {configLoading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Checking Jira connection...
            </div>
          ) : !isConfigured ? (
            /* Unconfigured State CTA */
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-200/60 shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-serif font-bold text-foreground">Connect your Jira Instance</h3>
              <p className="text-xs text-muted mt-2 mb-6 leading-relaxed">
                Connect your team's Atlassian Jira Cloud or Server instance using an API token to browse Kanban boards, To-Dos, sprints, and import requirements seamlessly.
              </p>
              <Button
                onClick={() => setConfigModalOpen(true)}
                className="bg-accent text-white hover:bg-accent/90 px-6 py-2 rounded-xl text-xs font-semibold shadow-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Configure Jira Connection
              </Button>
            </div>
          ) : (
            /* Configured State - Main UI */
            <div className="flex flex-col flex-1 overflow-hidden gap-3 mt-1">
              {/* Target Repository & Tab Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 bg-slate-50/80 p-2.5 rounded-xl border border-border/50">
                {/* Repository Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted flex items-center gap-1">
                    <FolderGit2 className="w-3.5 h-3.5 text-accent" />
                    Target Repo:
                  </span>
                  <select
                    value={selectedRepoId}
                    onChange={(e) => setSelectedRepoId(e.target.value)}
                    className="text-xs font-semibold bg-white border border-border/60 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-accent outline-none max-w-[220px]"
                  >
                    <option value="">Select repository...</option>
                    {repos?.map((r: { id: string; name: string }) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-border/60 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("browse");
                      setFeedback(null);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeTab === "browse"
                        ? "bg-accent text-white shadow-2xs"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Browse & Search Issues
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("quick");
                      setFeedback(null);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeTab === "quick"
                        ? "bg-accent text-white shadow-2xs"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Quick Key Fetch
                  </button>
                </div>
              </div>

              {/* Feedback Alerts */}
              {feedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 shrink-0 ${
                    feedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {feedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="flex-1">{feedback.message}</span>
                </div>
              )}

              {/* Tab 1: Browse & Search Issues */}
              {activeTab === "browse" && (
                <div className="flex flex-1 gap-3 overflow-hidden min-h-0">
                  {/* Left: Search, Filter & Issue Table */}
                  <div className="flex-1 flex flex-col gap-2.5 min-w-0 overflow-hidden">
                    {/* Filter Bar Row 1: Search & Project */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 shrink-0">
                      {/* Search Input */}
                      <div className="relative md:col-span-2">
                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          placeholder="Search key, title, To-Do, or keyword..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="text-xs pl-8 h-8 rounded-lg"
                        />
                      </div>

                      {/* Project Filter */}
                      <select
                        value={selectedProject}
                        onChange={(e) => {
                          setSelectedProject(e.target.value);
                          setSelectedBoardId("");
                          setSelectedSprintId("");
                        }}
                        className="text-xs bg-white border border-border/60 rounded-lg px-2.5 py-1.5 h-8 focus:ring-1 focus:ring-accent outline-none"
                      >
                        <option value="">All Projects</option>
                        {projects?.map((p) => (
                          <option key={p.id} value={p.key}>
                            {p.key} - {p.name}
                          </option>
                        ))}
                      </select>

                      {/* Issue Type Filter (Dynamic from Jira instance) */}
                      <select
                        value={selectedIssueType}
                        onChange={(e) => setSelectedIssueType(e.target.value)}
                        className="text-xs bg-white border border-border/60 rounded-lg px-2.5 py-1.5 h-8 focus:ring-1 focus:ring-accent outline-none"
                      >
                        <option value="">All Issue Types</option>
                        {issueTypes && issueTypes.length > 0 ? (
                          issueTypes.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} {t.subtask ? "(Sub-task)" : ""}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Story">Story</option>
                            <option value="Task">Task</option>
                            <option value="Bug">Bug</option>
                            <option value="Epic">Epic</option>
                            <option value="To Do">To Do</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Filter Bar Row 2: Agile Boards, Sprints, and Status Categories */}
                    <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 bg-slate-50/50 p-1.5 rounded-lg border border-border/40 text-xs">
                      {/* Left: Boards & Sprints */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Board selector */}
                        {boards && boards.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Kanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <select
                              value={selectedBoardId}
                              onChange={(e) => {
                                setSelectedBoardId(e.target.value);
                                setSelectedSprintId("");
                              }}
                              className="text-xs bg-white border border-border/60 rounded-md px-2 py-1 h-7 focus:ring-1 focus:ring-accent outline-none max-w-[180px]"
                            >
                              <option value="">All Boards</option>
                              {boards.map((b) => (
                                <option key={String(b.id)} value={String(b.id)}>
                                  {b.name} ({b.type})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Sprints selector */}
                        {sprints && sprints.length > 0 && (
                          <select
                            value={selectedSprintId}
                            onChange={(e) => setSelectedSprintId(e.target.value)}
                            className="text-xs bg-white border border-border/60 rounded-md px-2 py-1 h-7 focus:ring-1 focus:ring-accent outline-none max-w-[150px]"
                          >
                            <option value="">All Sprints</option>
                            {sprints.map((s) => (
                              <option key={String(s.id)} value={String(s.id)}>
                                {s.name} ({s.state})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Right: Quick Status Category Chips */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-muted font-semibold mr-1">Status:</span>
                        {[
                          { key: "", label: "All" },
                          { key: "To Do", label: "To Do / Backlog" },
                          { key: "In Progress", label: "In Progress" },
                          { key: "Done", label: "Done" },
                        ].map((chip) => {
                          const isActive = selectedStatusCategory === chip.key;
                          return (
                            <button
                              key={chip.key}
                              type="button"
                              onClick={() => setSelectedStatusCategory(chip.key)}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                                isActive
                                  ? "bg-accent text-white shadow-2xs"
                                  : "bg-white text-slate-600 hover:bg-slate-100 border border-border/50"
                              }`}
                            >
                              {chip.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Table Container */}
                    <div className="flex-1 border border-border/40 rounded-xl overflow-y-auto bg-white min-h-0">
                      {issuesLoading ? (
                        <div className="flex items-center justify-center py-16 text-xs text-muted">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Fetching Jira items...
                        </div>
                      ) : issues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center text-muted text-xs">
                          <FileText className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="font-semibold text-foreground">No Jira items found</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Try adjusting your project, board, or status filter.
                          </p>
                        </div>
                      ) : (
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50/80 sticky top-0 border-b border-border/40 z-10">
                            <tr>
                              <th className="w-8 px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedKeys.size >= issues.length && issues.length > 0}
                                  onChange={toggleAllVisible}
                                  className="rounded border-slate-300 text-accent focus:ring-accent cursor-pointer"
                                />
                              </th>
                              <th className="px-3 py-2 font-semibold text-muted text-[11px] uppercase">Key</th>
                              <th className="px-3 py-2 font-semibold text-muted text-[11px] uppercase">Summary</th>
                              <th className="px-3 py-2 font-semibold text-muted text-[11px] uppercase">Type</th>
                              <th className="px-3 py-2 font-semibold text-muted text-[11px] uppercase">Status</th>
                              <th className="px-3 py-2 text-right font-semibold text-muted text-[11px] uppercase">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {issues.map((issue: JiraIssue) => {
                              const isChecked = selectedKeys.has(issue.key);
                              const isPreviewing = previewKey === issue.key;
                              return (
                                <tr
                                  key={issue.key}
                                  onClick={() => setPreviewKey(issue.key)}
                                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                                    isPreviewing ? "bg-accent/5" : ""
                                  }`}
                                >
                                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleKey(issue.key)}
                                      className="rounded border-slate-300 text-accent focus:ring-accent cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-3 py-2 font-mono font-bold text-accent whitespace-nowrap">
                                    <a
                                      href={issue.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="hover:underline inline-flex items-center gap-1"
                                    >
                                      {issue.key}
                                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                    </a>
                                  </td>
                                  <td className="px-3 py-2 font-medium text-foreground max-w-[240px] truncate">
                                    {issue.summary}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                      {issue.issue_type}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                      {issue.status}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isImportingSingle || isImportingBatch}
                                      onClick={() => handleImportSingle(issue.key)}
                                      className="text-[11px] h-7 px-2.5 hover:bg-accent hover:text-white"
                                    >
                                      Import
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Batch Actions Footer */}
                    <div className="flex items-center justify-between pt-1 shrink-0">
                      <span className="text-xs text-muted font-medium">
                        {selectedKeys.size} issue{selectedKeys.size !== 1 ? "s" : ""} selected
                      </span>
                      {selectedKeys.size > 0 && (
                        <Button
                          size="sm"
                          onClick={handleImportBatch}
                          disabled={isImportingBatch || isImportingSingle}
                          className="bg-accent text-white hover:bg-accent/90 text-xs font-semibold shadow-xs"
                        >
                          {isImportingBatch ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              Importing ({selectedKeys.size})...
                            </>
                          ) : (
                            `Import Selected (${selectedKeys.size})`
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right: Issue Detail Preview Pane */}
                  {previewKey && (
                    <div className="w-80 border border-border/40 rounded-xl bg-slate-50/50 p-4 flex flex-col gap-3 overflow-y-auto shrink-0 text-xs">
                      {previewLoading ? (
                        <div className="flex items-center justify-center py-16 text-muted">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading preview...
                        </div>
                      ) : previewDetail ? (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <a
                                href={previewDetail.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono font-bold text-accent text-sm hover:underline inline-flex items-center gap-1"
                              >
                                {previewDetail.key}
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </a>
                              <h4 className="font-semibold text-foreground text-xs mt-1 leading-snug">
                                {previewDetail.summary}
                              </h4>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 py-1">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold text-[10px] border border-blue-200">
                              {previewDetail.status}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[10px] border border-slate-200">
                              {previewDetail.issue_type}
                            </span>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-semibold text-[10px] border border-amber-200">
                              {previewDetail.priority}
                            </span>
                          </div>

                          {previewDetail.labels?.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap text-[11px] text-muted">
                              <Tag className="w-3 h-3 shrink-0" />
                              {previewDetail.labels.map((l) => (
                                <span key={l} className="bg-white border rounded px-1.5 py-0.2">
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex-1 flex flex-col gap-1 mt-1">
                            <Label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                              Requirement Content (Markdown Preview)
                            </Label>
                            <div className="bg-white p-3 rounded-lg border border-border/40 font-mono text-[11px] text-foreground/90 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                              {previewDetail.description_markdown || "No description provided."}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            disabled={isImportingSingle || isImportingBatch}
                            onClick={() => handleImportSingle(previewDetail.key)}
                            className="w-full bg-accent text-white hover:bg-accent/90 font-semibold text-xs mt-1"
                          >
                            {isImportingSingle ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                Importing...
                              </>
                            ) : (
                              "Import as Requirement"
                            )}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Quick Key / URL Import */}
              {activeTab === "quick" && (
                <div className="flex flex-col gap-4 overflow-y-auto py-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <Label htmlFor="quick_key" className="text-xs font-semibold">
                        Jira Issue Key or URL
                      </Label>
                      <Input
                        id="quick_key"
                        placeholder="e.g. PROJ-123 or https://mycompany.atlassian.net/browse/PROJ-123"
                        value={quickInputKey}
                        onChange={(e) => setQuickInputKey(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleQuickFetch()}
                        className="text-xs font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleQuickFetch}
                      disabled={quickLoading || !quickInputKey.trim()}
                      className="bg-accent text-white hover:bg-accent/90 text-xs font-semibold h-9 px-4"
                    >
                      {quickLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Fetching...
                        </>
                      ) : (
                        "Fetch Issue"
                      )}
                    </Button>
                  </div>

                  {quickError && (
                    <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Could not find Jira issue. Please check the key/URL and ensure you have access.</span>
                    </div>
                  )}

                  {quickDetail && (
                    <div className="flex flex-col gap-3 p-4 bg-slate-50/70 border border-border/40 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <a
                            href={quickDetail.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-bold text-accent text-sm hover:underline inline-flex items-center gap-1"
                          >
                            {quickDetail.key}
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold text-[10px] border border-blue-200">
                            {quickDetail.status}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[10px] border border-slate-200">
                            {quickDetail.issue_type}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="custom_title" className="text-xs font-semibold">Requirement Title</Label>
                        <Input
                          id="custom_title"
                          value={quickCustomTitle || `[${quickDetail.key}] ${quickDetail.summary}`}
                          onChange={(e) => setQuickCustomTitle(e.target.value)}
                          className="text-xs font-medium"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="custom_text" className="text-xs font-semibold">Requirement Text (Markdown)</Label>
                        <textarea
                          id="custom_text"
                          rows={6}
                          value={quickCustomText || quickDetail.description_markdown}
                          onChange={(e) => setQuickCustomText(e.target.value)}
                          className="border rounded-lg p-3 text-xs font-mono resize-none bg-white focus:ring-1 focus:ring-accent outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          disabled={isImportingSingle}
                          onClick={() =>
                            handleImportSingle(
                              quickDetail.key,
                              quickCustomTitle || `[${quickDetail.key}] ${quickDetail.summary}`,
                              quickCustomText || quickDetail.description_markdown
                            )
                          }
                          className="bg-accent text-white hover:bg-accent/90 text-xs font-semibold"
                        >
                          {isImportingSingle ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              Creating Requirement...
                            </>
                          ) : (
                            "Import as Requirement"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Jira Configuration Modal */}
      <JiraConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        workspaceId={activeWorkspaceId}
      />
    </>
  );
}
