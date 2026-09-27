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
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-950 text-slate-100">
      {/* 1. Left Sidebar: Sessions List */}
      <div className="flex w-64 md:w-72 flex-col border-r border-slate-800 bg-slate-900/60 backdrop-blur-md">
        {/* Header with New Session button */}
        <div className="border-b border-slate-800 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sky-500/10 p-1.5 text-sky-400">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Agent Chats
            </span>
          </div>

          <button
            type="button"
            onClick={handleCreateSession}
            disabled={createSessionMutation.isPending || !activeWorkspaceId}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-500 transition shadow-sm disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Sessions Scroll List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingSessions ? (
            <div className="flex items-center justify-center p-8 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
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
                      ? "bg-sky-500/15 text-white font-medium border border-sky-500/30"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-sky-400" : "text-slate-500"}`} />
                    <span className="truncate">{sess.title}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(sess.id, e)}
                    className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* HITL Safety Badge */}
        <div className="border-t border-slate-800 p-3 bg-slate-950/40 text-[11px] text-slate-400 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Human-in-the-Loop protection active.</span>
        </div>
      </div>

      {/* 2. Main Center Workstation */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/40 px-5 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-200 truncate max-w-xs md:max-w-md">
              {sessionDetail?.session.title || "AI Code Impact & Review Assistant"}
            </h2>
            {sessionDetail?.session.current_phase && (
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-mono uppercase text-sky-400 border border-slate-700">
                {sessionDetail.session.current_phase}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Repository Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-300">
              <FolderGit2 className="h-3.5 w-3.5 text-sky-400" />
              <select
                value={activeRepositoryId || ""}
                onChange={(e) => setActiveRepositoryId(e.target.value || null)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-900">Select Repository...</option>
                {repositories.map((repo: any) => (
                  <option key={repo.id} value={repo.id} className="bg-slate-900">
                    {repo.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Requirement Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-300">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <select
                value={selectedReqId || ""}
                onChange={(e) => setSelectedReqId(e.target.value || null)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="" className="bg-slate-900">Link Story/BRD...</option>
                {requirements.map((req: any) => (
                  <option key={req.id} value={req.id} className="bg-slate-900">
                    {req.jira_key ? `[${req.jira_key}] ` : ""}{req.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Inspector */}
            <button
              type="button"
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className="rounded-lg border border-slate-800 bg-slate-900/80 p-1.5 text-slate-400 hover:text-white transition"
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
        <div className="border-t border-slate-800/80 bg-slate-950/80 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {QUICK_ACTIONS.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(action.prompt)}
              disabled={sendMessageMutation.isPending || isStreaming}
              className="shrink-0 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 hover:border-sky-500/40 hover:bg-slate-800 transition disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-800 bg-slate-900/90 p-4 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-950 px-4 py-2.5 shadow-inner focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition"
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
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none"
            />

            <button
              type="submit"
              disabled={!inputContent.trim() || sendMessageMutation.isPending || isStreaming}
              className="rounded-lg bg-sky-500 p-2 text-white hover:bg-sky-400 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-sky-500/20"
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
