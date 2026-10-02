"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  User,
  ChevronDown,
  ChevronRight,
  Terminal,
  Loader2,
  Cpu,
  AlertCircle,
  FolderGit2,
  Layers,
  GitPullRequest,
} from "lucide-react";
import type { AgentApproval, AgentMessage, PRDraft } from "../types";
import { StartingPointCard } from "./cards/StartingPointCard";
import { PreReviewCard } from "./cards/PreReviewCard";
import { PRDraftCard } from "./cards/PRDraftCard";

interface AgentChatThreadProps {
  messages: AgentMessage[];
  pendingApproval?: AgentApproval | null;
  onApprove: (feedback?: string) => Promise<void>;
  onReject: (feedback?: string) => Promise<void>;
  isSubmittingApproval?: boolean;
  isStreaming?: boolean;
  statusMessage?: string | null;
  streamingContent?: string;
  optimisticUserMessage?: string | null;
}

export function AgentChatThread({
  messages,
  pendingApproval,
  onApprove,
  onReject,
  isSubmittingApproval,
  isStreaming,
  statusMessage,
  streamingContent,
  optimisticUserMessage,
}: AgentChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [openReasoningMap, setOpenReasoningMap] = useState<Record<string, boolean>>({});

  const toggleReasoning = (id: string) => {
    setOpenReasoningMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, statusMessage, optimisticUserMessage]);

  const renderApprovalCard = (approval: AgentApproval) => {
    if (approval.action_type === "confirm_starting_point") {
      const spList = approval.payload?.starting_points || [];
      const impact = approval.payload?.impact_summary;
      return (
        <StartingPointCard
          approval={approval}
          startingPoints={spList}
          impactSummary={impact}
          onApprove={onApprove}
          onReject={onReject}
          isSubmitting={isSubmittingApproval}
        />
      );
    } else if (approval.action_type === "confirm_review_standards") {
      const findings = approval.payload?.review_findings || [];
      const testGaps = approval.payload?.test_gaps || [];
      return (
        <PreReviewCard
          approval={approval}
          reviewFindings={findings}
          testGaps={testGaps}
          onApprove={onApprove}
          onReject={onReject}
          isSubmitting={isSubmittingApproval}
        />
      );
    }
    return null;
  };

  const showOptimisticMessage =
    optimisticUserMessage &&
    (!messages.length ||
      messages[messages.length - 1].sender !== "user" ||
      messages[messages.length - 1].content !== optimisticUserMessage);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((msg, index) => {
        const isUser = msg.sender === "user";
        const isLastMessage = index === messages.length - 1;
        const reasoningOpen = !!openReasoningMap[msg.id];

        return (
          <div
            key={msg.id}
            className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
          >
            {/* Agent Avatar */}
            {!isUser && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-xs border border-accent/20">
                <Sparkles className="h-4 w-4 text-emerald-300" />
              </div>
            )}

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl p-4.5 text-sm transition shadow-xs ${
                isUser
                  ? "bg-accent text-white rounded-tr-sm shadow-accent/10"
                  : msg.message_type === "error"
                  ? "bg-rose-50 border border-rose-200 text-rose-800 rounded-tl-sm"
                  : "bg-white border border-border/80 text-foreground rounded-tl-sm shadow-xs"
              }`}
            >
              {/* Agent role / reasoning pill */}
              {!isUser && msg.agent_role && msg.agent_role !== "system" && (
                <div className="mb-2.5">
                  <button
                    type="button"
                    onClick={() => toggleReasoning(msg.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-[#FAF8F5] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-slate-100 transition"
                  >
                    <Cpu className="h-3 w-3 text-accent" />
                    <span>Agent: {msg.agent_role}</span>
                    {reasoningOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>

                  {reasoningOpen && (
                    <div className="mt-2 rounded-xl border border-border/60 bg-[#FAF8F5] p-2.5 font-mono text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1 text-accent font-semibold mb-1">
                        <Terminal className="h-3 w-3" />
                        <span>Tool Invocation Log</span>
                      </div>
                      <p>Executed autonomous symbol exploration and standards verification pipeline.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Message Content */}
              <div
                className={`prose prose-xs max-w-none break-words leading-relaxed ${
                  isUser
                    ? "prose-invert text-white"
                    : "prose-slate text-foreground prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground prose-code:text-accent prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
                }`}
              >
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              {/* Tagged Context Chips if attached to message */}
              {msg.artifacts?.tagged_entities && Array.isArray(msg.artifacts.tagged_entities) && msg.artifacts.tagged_entities.length > 0 && (
                <div className={`flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t ${isUser ? "border-white/20" : "border-border/50"}`}>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${isUser ? "text-white/70" : "text-muted-foreground"}`}>
                    Context:
                  </span>
                  {msg.artifacts.tagged_entities.map((tag: any, tIdx: number) => (
                    <span
                      key={tIdx}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border shadow-2xs ${
                        isUser
                          ? "bg-white/15 text-white border-white/30"
                          : tag.type === "repo"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : tag.type === "req"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {tag.type === "repo" && <FolderGit2 className="h-3 w-3 shrink-0" />}
                      {tag.type === "req" && <Layers className="h-3 w-3 shrink-0" />}
                      {tag.type === "pr" && <GitPullRequest className="h-3 w-3 shrink-0" />}
                      <span className="truncate max-w-[200px]">{tag.name || tag.id}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Interactive approval card rendered directly on last message or when pending */}
              {!isUser && isLastMessage && pendingApproval && renderApprovalCard(pendingApproval)}
            </div>

            {/* User Avatar */}
            {isUser && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-foreground border border-border/60 shadow-xs">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        );
      })}

      {/* Optimistic User Message Bubble */}
      {showOptimisticMessage && (
        <div className="flex gap-3.5 justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm p-4.5 text-sm bg-accent text-white shadow-accent/10 shadow-xs">
            <div className="prose prose-invert prose-xs max-w-none break-words leading-relaxed text-white">
              <p>{optimisticUserMessage}</p>
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-foreground border border-border/60 shadow-xs">
            <User className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Live Streaming State Bubble */}
      {isStreaming && (
        <div className="flex gap-3.5 justify-start">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-xs border border-accent/20 animate-pulse">
            <Sparkles className="h-4 w-4 text-emerald-300" />
          </div>

          <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border/80 bg-white p-4 text-sm text-foreground shadow-xs">
            {statusMessage && (
              <div className="flex items-center gap-2 text-xs text-accent font-semibold mb-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                <span>{statusMessage}</span>
              </div>
            )}

            {streamingContent ? (
              <div className="prose prose-slate prose-xs max-w-none break-words leading-relaxed text-foreground prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground prose-code:text-accent prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                <ReactMarkdown>{streamingContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 py-1 text-muted-foreground text-xs">
                <div className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                <div className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                <div className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
