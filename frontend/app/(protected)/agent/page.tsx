"use client";

import { useEffect, useState } from "react";
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
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace";
import { useRepositories } from "@/features/repositories/api/queries";
import { useRequirements } from "@/features/requirements/api/queries";
import {
  useAgentSessions,
  useAgentSession,
  useCreateAgentSession,
  useDeleteAgentSession,
  useSendAgentMessage,
  useSubmitAgentApproval,
} from "@/features/agent/api/queries";
import { useAgentStream } from "@/features/agent/hooks/useAgentStream";
import { AgentChatThread } from "@/features/agent/components/AgentChatThread";
import { AgentContextInspector } from "@/features/agent/components/AgentContextInspector";
import type { AgentApproval } from "@/features/agent/types";

const QUICK_ACTIONS = [
  { label: "📍 Find Starting Points", prompt: "Where should I start in the codebase to implement this requirement?" },
  { label: "💥 Check Blast Radius", prompt: "What is the estimated blast radius and downstream dependencies for this change?" },
  { label: "🛡️ Pre-Review Standards", prompt: "Run an automated pre-review audit against our coding standards and security policies." },
  { label: "🧪 Check Missing Tests", prompt: "Identify any missing unit test coverage gaps for the affected functions." },
  { label: "📝 Draft PR Description", prompt: "Generate a production-ready Pull Request description linked to this requirement." },
];

export default function AgentPage() {
  const { activeWorkspaceId, activeRepositoryId, setActiveRepositoryId } = useWorkspaceStore();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [inputContent, setInputContent] = useState("");
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isSessionSidebarOpen, setIsSessionSidebarOpen] = useState(true);

  // Queries
  const { data: repositories = [] } = useRepositories({ workspaceId: activeWorkspaceId });
  const { data: requirements = [] } = useRequirements(activeRepositoryId);
  const { data: sessions = [], isLoading: isLoadingSessions } = useAgentSessions(activeWorkspaceId);
  const { data: sessionDetail, refetch: refetchSessionDetail } = useAgentSession(selectedSessionId);

  // Mutations
  const createSessionMutation = useCreateAgentSession();
  const deleteSessionMutation = useDeleteAgentSession();
  const sendMessageMutation = useSendAgentMessage();
  const submitApprovalMutation = useSubmitAgentApproval();

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

  // Auto-select latest session or create initial session
  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const handleCreateSession = async () => {
    if (!activeWorkspaceId) return;
    try {
      const newSession = await createSessionMutation.mutateAsync({
        workspace_id: activeWorkspaceId,
        repository_id: activeRepositoryId,
        requirement_id: selectedReqId,
        title: "New Codebase Assistant Chat",
      });
      setSelectedSessionId(newSession.id);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    try {
      await deleteSessionMutation.mutateAsync({ sessionId, workspaceId: activeWorkspaceId });
      if (selectedSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setSelectedSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputContent;
    if (!text.trim() || !selectedSessionId || sendMessageMutation.isPending || isStreaming) return;

    setInputContent("");
    try {
      // Trigger background stream listener
      startStream();

      await sendMessageMutation.mutateAsync({
        sessionId: selectedSessionId,
        content: text.trim(),
      });

      refetchSessionDetail();
    } catch (err) {
      console.error("Failed to send message:", err);
      stopStream();
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

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background text-foreground">
      {/* 1. Left Sidebar: Sessions List (Collapsible for maximum spaciousness) */}
      {isSessionSidebarOpen && (
        <aside className="flex w-64 md:w-72 flex-col border-r border-border/50 bg-slate-50/60 backdrop-blur-md shrink-0 transition-all duration-300">
          {/* Header with New Session button & Collapse toggle */}
          <div className="border-b border-border/50 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-accent/10 p-1.5 text-accent">
                <Bot className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold font-serif uppercase tracking-wider text-foreground">
                Agent Chats
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCreateSession}
                disabled={createSessionMutation.isPending || !activeWorkspaceId}
                className="inline-flex items-center gap-1 rounded-xl bg-accent px-2.5 py-1 text-xs font-semibold text-white hover:bg-accent/90 transition shadow-2xs disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSessionSidebarOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-black/[0.04] rounded-lg transition"
                title="Collapse Session List"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sessions Scroll List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingSessions ? (
              <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2 text-accent" /> Loading sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No sessions yet. Click <strong>New</strong> above to start!
              </div>
            ) : (
              sessions.map((sess) => {
                const isSelected = sess.id === selectedSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSessionId(sess.id)}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition cursor-pointer ${
                      isSelected
                        ? "bg-white text-accent font-semibold border border-border/70 shadow-xs"
                        : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-accent" : "text-muted-foreground"}`} />
                      <span className="truncate">{sess.title}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:bg-slate-100 hover:text-rose-600 transition"
                      title="Delete Session"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* HITL Safety Badge */}
          <div className="border-t border-border/50 p-3 bg-white/40 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Human-in-the-Loop protection active.</span>
          </div>
        </aside>
      )}

      {/* 2. Main Center Workstation */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-white/70 backdrop-blur-md px-5 py-3">
          <div className="flex items-center gap-3">
            {!isSessionSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSessionSidebarOpen(true)}
                className="p-1.5 text-muted-foreground hover:text-accent hover:bg-black/[0.04] rounded-lg transition border border-border/60 bg-white shadow-2xs mr-1"
                title="Open Session List"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}

            <h2 className="text-sm font-bold font-serif text-foreground truncate max-w-xs md:max-w-md tracking-tight">
              {sessionDetail?.session.title || "AI Code Impact & Review Assistant"}
            </h2>
            {sessionDetail?.session.current_phase && (
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-mono uppercase text-accent border border-accent/20 font-semibold">
                {sessionDetail.session.current_phase}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Repository Selector */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-white px-2.5 py-1 text-xs text-foreground shadow-2xs">
              <FolderGit2 className="h-3.5 w-3.5 text-accent" />
              <select
                value={activeRepositoryId || ""}
                onChange={(e) => setActiveRepositoryId(e.target.value || null)}
                className="bg-transparent text-foreground focus:outline-none cursor-pointer font-medium"
              >
                <option value="">Select Repository...</option>
                {repositories.map((repo: any) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Requirement Selector */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-white px-2.5 py-1 text-xs text-foreground shadow-2xs">
              <Layers className="h-3.5 w-3.5 text-purple-600" />
              <select
                value={selectedReqId || ""}
                onChange={(e) => setSelectedReqId(e.target.value || null)}
                className="bg-transparent text-foreground focus:outline-none cursor-pointer max-w-[150px] truncate font-medium"
              >
                <option value="">Link Story/BRD...</option>
                {requirements.map((req: any) => (
                  <option key={req.id} value={req.id}>
                    {req.jira_key ? `[${req.jira_key}] ` : ""}{req.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Inspector */}
            <button
              type="button"
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className="rounded-xl border border-border/70 bg-white p-1.5 text-muted-foreground hover:text-accent shadow-2xs transition"
              title="Toggle Context & Artifact Inspector"
            >
              {isInspectorOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
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
        />

        {/* Quick Action Suggestion Chips */}
        <div className="border-t border-border/50 bg-[#FAF8F5]/60 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(action.prompt)}
              disabled={sendMessageMutation.isPending || isStreaming}
              className="shrink-0 rounded-full border border-border/80 bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:text-accent hover:bg-white shadow-2xs transition disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-border/50 bg-white/90 p-4 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3 rounded-2xl border border-border/80 bg-[#FAF8F5]/80 px-4 py-2.5 shadow-inner focus-within:border-accent focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/10 transition"
          >
            <textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask the AI agent... (e.g. 'Where should I start for requirement PROJ-102?')"
              rows={1}
              disabled={sendMessageMutation.isPending || isStreaming}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
            />

            <button
              type="submit"
              disabled={!inputContent.trim() || sendMessageMutation.isPending || isStreaming}
              className="rounded-xl bg-accent p-2 text-white hover:bg-accent/90 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {sendMessageMutation.isPending || isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* 3. Right Sidebar: Context & Artifact Inspector */}
      <AgentContextInspector
        sessionDetail={sessionDetail}
        isOpen={isInspectorOpen}
        onToggle={() => setIsInspectorOpen(!isInspectorOpen)}
      />
    </div>
  );
}
