"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  Bot,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  FolderGit2,
  Layers,
  GitPullRequest,
  AtSign,
  X,
  ShieldCheck,
  Loader2,
  Search,
  AlertCircle,
  RefreshCw,
  Pencil,
  Check,
} from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useWorkspaces } from "@/features/workspace/api/queries";
import { useRepositories, useResyncRepository } from "@/features/repositories/api/queries";
import { useRequirements } from "@/features/requirements/api/queries";
import { usePRReviews } from "@/features/pr-reviews/api/queries";
import {
  useAgentSessions,
  useAgentSession,
  useCreateAgentSession,
  useUpdateAgentSession,
  useDeleteAgentSession,
  useSendAgentMessage,
  useSubmitAgentApproval,
} from "@/features/agent/api/queries";
import { useAgentStream } from "@/features/agent/hooks/useAgentStream";
import { AgentChatThread } from "@/features/agent/components/AgentChatThread";
import { AgentContextInspector } from "@/features/agent/components/AgentContextInspector";
import { AgentMentionMenu, type MentionItem } from "@/features/agent/components/AgentMentionMenu";
import type { TaggedEntity } from "@/features/agent/types";

const QUICK_ACTIONS = [
  { label: "📍 Find Starting Points", prompt: "Where should I start in the codebase to implement this requirement?" },
  { label: "💥 Check Blast Radius", prompt: "What is the estimated blast radius and downstream dependencies for this change?" },
  { label: "🛡️ Pre-Review Standards", prompt: "Run an automated pre-review audit against our coding standards and security policies." },
  { label: "🧪 Check Missing Tests", prompt: "Identify any missing unit test coverage gaps for the affected functions." },
  { label: "📝 Draft PR Description", prompt: "Generate a production-ready Pull Request description linked to this requirement." },
];

const PHASE_LABELS: Record<string, string> = {
  idle: "Idle",
  exploring: "Exploring",
  chatting: "Chatting",
  reviewing: "Reviewing",
  drafting_pr: "Drafting PR",
  drafting: "Drafting PR",
  awaiting_starting_point_approval: "Waiting for approval",
  awaiting_pr_approval: "Waiting for approval",
  awaiting_confirm_review_standards: "Waiting for approval",
  starting_points_approved: "Starting points confirmed",
  review_approved: "Review acknowledged",
  pr_drafted: "PR draft ready",
  needs_repository: "Needs repository",
  needs_indexing: "Indexing required",
  needs_diff: "Needs diff",
  starting_points_rejected: "Rejected",
  review_rejected: "Rejected",
  completed: "Done",
};

export default function AgentPage() {
  const { activeWorkspaceId, activeWorkspaceName, setActiveWorkspace, activeRepositoryId, setActiveRepositoryId } = useWorkspaceStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [inputContent, setInputContent] = useState("");
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isSessionSidebarOpen, setIsSessionSidebarOpen] = useState(true);
  const [sessionSearch, setSessionSearch] = useState("");
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);

  // Workspaces query to auto-resolve active workspace if unselected
  const { data: workspaces = [] } = useWorkspaces();

  useEffect(() => {
    if (!activeWorkspaceId && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id, workspaces[0].name);
    }
  }, [activeWorkspaceId, workspaces, setActiveWorkspace]);

  // Queries
  const { data: repositories = [] } = useRepositories({ workspaceId: activeWorkspaceId });
  const { data: requirements = [] } = useRequirements(activeRepositoryId);
  const { data: pullRequests = [] } = usePRReviews();
  const { data: sessions = [], isLoading: isLoadingSessions } = useAgentSessions(activeWorkspaceId);
  const { data: sessionDetail, refetch: refetchSessionDetail } = useAgentSession(selectedSessionId);
  const { mutate: resyncRepo, isPending: isResyncPending } = useResyncRepository();

  // Mention & Tagging State
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [taggedEntities, setTaggedEntities] = useState<TaggedEntity[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mutations
  const createSessionMutation = useCreateAgentSession();
  const updateSessionMutation = useUpdateAgentSession();
  const deleteSessionMutation = useDeleteAgentSession();
  const sendMessageMutation = useSendAgentMessage();
  const submitApprovalMutation = useSubmitAgentApproval();

  // Rename Session State
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // SSE Stream
  const {
    isStreaming,
    statusMessage,
    streamingContent,
    startStream,
    stopStream,
  } = useAgentStream({
    sessionId: selectedSessionId,
    onDone: () => {
      refetchSessionDetail();
    },
    onApprovalRequired: () => {
      refetchSessionDetail();
    },
  });

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const handleCreateSession = async () => {
    const wsId = activeWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);
    const activeRepo = repositories.find((r: any) => r.id === activeRepositoryId);
    const activeReq = requirements.find((rq: any) => rq.id === selectedReqId);

    let initialTitle = "New Chat";
    if (activeRepo?.name) {
      const shortRepo = activeRepo.name.split("/").pop() || activeRepo.name;
      initialTitle = `New Chat • ${shortRepo}`;
    } else if (activeReq?.title) {
      const label = activeReq.jira_issue_key || activeReq.title.slice(0, 20);
      initialTitle = `New Chat • ${label}`;
    } else if (sessions.length > 0) {
      initialTitle = `New Chat ${sessions.length + 1}`;
    }

    try {
      const newSession = await createSessionMutation.mutateAsync({
        workspace_id: wsId || undefined,
        repository_id: activeRepositoryId,
        requirement_id: selectedReqId,
        title: initialTitle,
      });
      setSelectedSessionId(newSession.id);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleStartRename = (sess: { id: string; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(sess.id);
    setEditingTitle(sess.title);
  };

  const handleSaveRename = async (sessionId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }
    try {
      await updateSessionMutation.mutateAsync({ sessionId, title: trimmed });
    } catch (err) {
      console.error("Failed to rename session:", err);
    } finally {
      setEditingSessionId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSessionMutation.mutateAsync({ sessionId, workspaceId: activeWorkspaceId || undefined });
      if (selectedSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setSelectedSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputContent(val);

    const cursorPos = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\-\.\/]*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setIsMentionOpen(true);
    } else {
      setIsMentionOpen(false);
    }
  };

  const handleSelectMention = (item: MentionItem) => {
    const newEntity: TaggedEntity = {
      type: item.type,
      id: item.id,
      label: item.label,
      name: item.label,
    };
    setTaggedEntities((prev) => {
      if (prev.some((e) => e.type === newEntity.type && e.id === newEntity.id)) {
        return prev;
      }
      return [...prev, newEntity];
    });

    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart ?? inputContent.length;
      const textBeforeCursor = inputContent.slice(0, cursorPos);
      const textAfterCursor = inputContent.slice(cursorPos);
      const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\-\.\/]*)$/);

      if (mentionMatch) {
        const matchIndex = textBeforeCursor.lastIndexOf("@" + mentionMatch[1]);
        const beforeMention = textBeforeCursor.slice(0, matchIndex);
        const inserted = `@${item.label} `;
        const nextText = `${beforeMention}${inserted}${textAfterCursor}`;
        setInputContent(nextText);

        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = beforeMention.length + inserted.length;
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      }
    }

    setIsMentionOpen(false);
    setMentionQuery("");
  };

  const handleRemoveTag = (type: string, id: string) => {
    setTaggedEntities((prev) => prev.filter((e) => !(e.type === type && e.id === id)));
  };

  const handleTriggerMention = () => {
    setIsMentionOpen(true);
    setMentionQuery("");
    if (textareaRef.current) {
      textareaRef.current.focus();
      const val = textareaRef.current.value;
      if (!val.endsWith("@")) {
        const updated = val + (val.length > 0 && !val.endsWith(" ") ? " @" : "@");
        setInputContent(updated);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputContent).trim();
    if (!text || sendMessageMutation.isPending) return;

    let currentSessionId = selectedSessionId;
    if (!currentSessionId) {
      const wsId =
        activeWorkspaceId ||
        useWorkspaceStore.getState().activeWorkspaceId ||
        (workspaces.length > 0 ? workspaces[0].id : null);

      try {
        const newSession = await createSessionMutation.mutateAsync({
          workspace_id: wsId || undefined,
          repository_id: activeRepositoryId,
          requirement_id: selectedReqId,
          title: text.slice(0, 35).trim() || "New Chat",
        });
        currentSessionId = newSession.id;
        setSelectedSessionId(newSession.id);
      } catch (err) {
        console.error("Failed to auto-create session:", err);
        return;
      }
    }

    const currentTags = [...taggedEntities];
    setInputContent("");
    setTaggedEntities([]);
    setIsMentionOpen(false);
    setOptimisticUserMessage(text);

    try {
      try {
        startStream();
      } catch (streamErr) {
        console.warn("Stream start error:", streamErr);
      }

      await sendMessageMutation.mutateAsync({
        sessionId: currentSessionId,
        content: text,
        tagged_entities: currentTags.length > 0 ? currentTags : undefined,
        repository_id: activeRepositoryId || undefined,
        requirement_id: selectedReqId || undefined,
      });

      await refetchSessionDetail();
    } catch (err) {
      console.error("Failed to send message:", err);
      stopStream();
    } finally {
      setOptimisticUserMessage(null);
    }
  };

  const handleApprove = async (feedback?: string) => {
    if (!selectedSessionId || !sessionDetail?.pending_approval) return;
    try {
      startStream();
      await submitApprovalMutation.mutateAsync({
        sessionId: selectedSessionId,
        approvalId: sessionDetail.pending_approval.id,
        action: "approve",
        user_feedback: feedback,
      });
      refetchSessionDetail();
    } catch (err) {
      console.error("Failed to approve:", err);
      stopStream();
    }
  };

  const handleReject = async (feedback?: string) => {
    if (!selectedSessionId || !sessionDetail?.pending_approval) return;
    try {
      startStream();
      await submitApprovalMutation.mutateAsync({
        sessionId: selectedSessionId,
        approvalId: sessionDetail.pending_approval.id,
        action: "reject",
        user_feedback: feedback,
      });
      refetchSessionDetail();
    } catch (err) {
      console.error("Failed to reject:", err);
      stopStream();
    }
  };

  const activeRepo = repositories.find((r: any) => r.id === activeRepositoryId);
  const activeReq = requirements.find((r: any) => r.id === selectedReqId || r.jira_issue_key === selectedReqId);
  const startingPointsCount = sessionDetail?.session.context_metadata?.starting_points?.length || 0;

  const filteredSessions = sessions.filter((sess) =>
    sess.title.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  return (
    <div className="flex flex-1 h-full w-full min-h-0 min-w-0 overflow-hidden bg-background text-foreground">
      {/* 1. Left Sidebar: Compact Sessions List */}
      {isSessionSidebarOpen && (
        <aside className="flex w-60 md:w-64 flex-col h-full min-h-0 border-r border-border/60 bg-white/70 backdrop-blur-md shrink-0 transition-all duration-300 overflow-hidden z-10">
          {/* Header with New Session & Collapse */}
          <div className="border-b border-border/60 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="rounded-lg bg-accent p-1 text-white shadow-2xs">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold font-serif uppercase tracking-wider text-foreground">
                    Agent Chats
                  </span>
                  <span className="text-[9.5px] text-muted-foreground truncate max-w-[100px]">
                    {activeWorkspaceName || "Personal"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCreateSession}
                  disabled={createSessionMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-accent px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-accent/90 transition shadow-2xs disabled:opacity-50 cursor-pointer"
                  title="New Conversation"
                >
                  <Plus className="h-3 w-3" />
                  <span>New</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSessionSidebarOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded transition cursor-pointer"
                  title="Collapse Session List"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Session Search */}
            {sessions.length > 3 && (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Filter..."
                  className="w-full rounded-md border border-border/70 bg-[#FAF8F5]/80 py-1 pl-7 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* Sessions Scroll List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-0.5">
            {isLoadingSessions ? (
              <div className="flex items-center justify-center p-6 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-accent" /> Loading...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-muted-foreground space-y-1.5">
                <p>No chats found.</p>
                <button
                  type="button"
                  onClick={handleCreateSession}
                  className="font-semibold text-accent hover:underline cursor-pointer"
                >
                  New chat
                </button>
              </div>
            ) : (
              filteredSessions.map((sess) => {
                const isSelected = sess.id === selectedSessionId;
                const isEditing = sess.id === editingSessionId;

                if (isEditing) {
                  return (
                    <div
                      key={sess.id}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1 bg-accent/5 border border-accent/40 shadow-2xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageSquare className="h-3 w-3 shrink-0 text-accent" />
                      <input
                        type="text"
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename(sess.id);
                          if (e.key === "Escape") setEditingSessionId(null);
                        }}
                        onBlur={() => handleSaveRename(sess.id)}
                        className="w-full rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-foreground border border-accent/30 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(sess.id)}
                        className="rounded p-0.5 text-accent hover:bg-accent/10 transition cursor-pointer"
                        title="Save"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSessionId(sess.id)}
                    onDoubleClick={(e) => handleStartRename(sess, e)}
                    className={`group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11.5px] transition cursor-pointer ${
                      isSelected
                        ? "bg-accent/5 text-accent font-semibold border border-accent/20 shadow-2xs"
                        : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className={`h-3 w-3 shrink-0 ${isSelected ? "text-accent" : "text-muted-foreground"}`} />
                      <span className="truncate" title={sess.title}>
                        {sess.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0 ml-1">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(sess, e)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-foreground transition cursor-pointer"
                        title="Rename Chat"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Delete Session"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Minimal HITL Safety Badge */}
          <div className="border-t border-border/50 p-2.5 bg-white/40 text-[10px] text-muted-foreground flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>HITL safety active</span>
          </div>
        </aside>
      )}

      {/* 2. Main Center Workstation */}
      <div className="flex flex-1 h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#FAF8F5]/30">
        {/* Compact Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-white/80 backdrop-blur-md px-4 py-2 shrink-0 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            {!isSessionSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSessionSidebarOpen(true)}
                className="p-1 text-muted-foreground hover:text-accent hover:bg-slate-100 rounded transition border border-border/70 bg-white shadow-2xs cursor-pointer"
                title="Open Session List"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </button>
            )}

            <h2 className="text-xs md:text-sm font-bold font-serif text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-md tracking-tight">
              {sessionDetail?.session.title || "AI Codebase Assistant"}
            </h2>

            {sessionDetail?.session.current_phase && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9.5px] font-mono uppercase text-accent border border-accent/20 font-semibold shrink-0">
                {PHASE_LABELS[sessionDetail.session.current_phase] ?? sessionDetail.session.current_phase.replace(/_/g, " ")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Compact Repository Selector */}
            <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-white px-2 py-0.5 text-[11px] text-foreground shadow-2xs hover:border-accent/40 transition">
              <FolderGit2 className="h-3 w-3 text-accent shrink-0" />
              <select
                value={activeRepositoryId || ""}
                onChange={(e) => setActiveRepositoryId(e.target.value || null)}
                className="bg-transparent text-foreground focus:outline-none cursor-pointer font-medium max-w-[120px] sm:max-w-[160px] truncate"
              >
                <option value="">Repo...</option>
                {repositories.map((repo: any) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Compact Story Selector */}
            <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-white px-2 py-0.5 text-[11px] text-foreground shadow-2xs hover:border-accent/40 transition">
              <Layers className="h-3 w-3 text-purple-600 shrink-0" />
              <select
                value={selectedReqId || ""}
                onChange={(e) => setSelectedReqId(e.target.value || null)}
                className="bg-transparent text-foreground focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[160px] truncate font-medium"
              >
                <option value="">Story...</option>
                {requirements.map((req: any) => (
                  <option key={req.id} value={req.id}>
                    {req.jira_issue_key ? `[${req.jira_issue_key}] ` : ""}{req.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Inspector */}
            <button
              type="button"
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`relative rounded-lg border px-2 py-1 text-[11px] font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer ${
                isInspectorOpen
                  ? "bg-accent text-white border-accent shadow-xs"
                  : "bg-white text-muted-foreground border-border/70 hover:text-accent hover:border-accent/40"
              }`}
              title="Toggle Context & Artifact Inspector"
            >
              {isInspectorOpen ? (
                <>
                  <PanelRightClose className="h-3 w-3" />
                  <span className="hidden sm:inline">Inspector</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-3 w-3" />
                  <span className="hidden sm:inline">Inspector</span>
                  {startingPointsCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Chat Thread Messages */}
        <AgentChatThread
          messages={sessionDetail?.messages || []}
          pendingApproval={sessionDetail?.pending_approval}
          onApprove={handleApprove}
          onReject={handleReject}
          isSubmittingApproval={submitApprovalMutation.isPending}
          isStreaming={isStreaming}
          statusMessage={statusMessage}
          streamingContent={streamingContent}
          optimisticUserMessage={optimisticUserMessage}
          onQuickAction={(prompt) => handleSendMessage(prompt)}
          activeRepoName={activeRepo?.name}
          activeReqTitle={activeReq?.jira_issue_key ? `[${activeReq.jira_issue_key}] ${activeReq.title}` : activeReq?.title}
        />

        {/* Indexing Required Banner */}
        {sessionDetail?.session?.current_phase === "needs_indexing" && activeRepositoryId && (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 shrink-0 flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Repository <strong>{activeRepo?.name || "selected"}</strong> is not indexed yet.
              </span>
            </div>
            <button
              type="button"
              disabled={isResyncPending}
              onClick={() => resyncRepo(activeRepositoryId)}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 shadow-2xs transition disabled:opacity-50 cursor-pointer"
            >
              {isResyncPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 text-amber-700" />
                  <span>Sync & Index Now</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Minimal Quick Action Suggestion Chips */}
        <div className="border-t border-border/60 bg-white/70 px-3 py-1.5 shrink-0">
          <div className="max-w-4xl lg:max-w-5xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(action.prompt)}
                disabled={sendMessageMutation.isPending}
                className="shrink-0 rounded-full border border-border/70 bg-white px-2.5 py-0.5 text-[11px] font-medium text-foreground hover:border-accent hover:text-accent hover:bg-slate-50 shadow-2xs transition disabled:opacity-50 cursor-pointer"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Minimal Bottom Input Area */}
        <div className="relative border-t border-border/60 bg-white/95 p-3 backdrop-blur-md shrink-0">
          <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-2">
            {/* Mention Menu */}
            <AgentMentionMenu
              isOpen={isMentionOpen}
              query={mentionQuery}
              repositories={repositories}
              requirements={requirements}
              pullRequests={pullRequests}
              onSelect={handleSelectMention}
              onClose={() => setIsMentionOpen(false)}
            />

            {/* Active Tagged Context Chips */}
            {taggedEntities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[9.5px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mr-1">
                  <AtSign className="h-2.5 w-2.5 text-accent" />
                  <span>Context:</span>
                </span>
                {taggedEntities.map((entity) => (
                  <span
                    key={`${entity.type}-${entity.id}`}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-medium border shadow-2xs ${
                      entity.type === "repo"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : entity.type === "req"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {entity.type === "repo" && <FolderGit2 className="h-2.5 w-2.5 shrink-0" />}
                    {entity.type === "req" && <Layers className="h-2.5 w-2.5 shrink-0" />}
                    {entity.type === "pr" && <GitPullRequest className="h-2.5 w-2.5 shrink-0" />}
                    <span className="truncate max-w-[140px]">{entity.label || entity.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(entity.type, entity.id)}
                      className="ml-0.5 rounded p-0.5 hover:bg-black/10 transition cursor-pointer"
                      title="Remove"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Compact Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputContent.trim()) {
                  handleSendMessage(inputContent);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-[#FAF8F5]/80 p-1.5 shadow-2xs focus-within:border-accent focus-within:bg-white focus-within:ring-1 focus-within:ring-accent/20 transition"
            >
              <button
                type="button"
                onClick={handleTriggerMention}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-accent hover:bg-slate-100 transition shrink-0 cursor-pointer"
                title="Tag Repository, Story, or PR (@)"
              >
                <AtSign className="h-3.5 w-3.5" />
              </button>

              <textarea
                ref={textareaRef}
                value={inputContent}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (isMentionOpen) {
                    if (e.key === "Enter" || e.key === "Tab" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Escape") {
                      return;
                    }
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (inputContent.trim()) {
                      handleSendMessage(inputContent);
                    }
                  }
                }}
                placeholder="Ask the AI agent... Type @ to reference repos or stories"
                rows={1}
                disabled={sendMessageMutation.isPending}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none py-1 leading-relaxed"
              />

              <button
                type="submit"
                disabled={!inputContent.trim() || sendMessageMutation.isPending}
                className="rounded-lg bg-accent p-2 text-white hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs shrink-0 cursor-pointer"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. Right Sidebar: Compact Context & Artifact Inspector */}
      <AgentContextInspector
        sessionDetail={sessionDetail}
        requirementTitle={activeReq?.title}
        jiraKey={activeReq?.jira_issue_key || undefined}
        isOpen={isInspectorOpen}
        onToggle={() => setIsInspectorOpen(!isInspectorOpen)}
      />
    </div>
  );
}
