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
}: AgentChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [openReasoningMap, setOpenReasoningMap] = useState<Record<string, boolean>>({});

  const toggleReasoning = (id: string) => {
    setOpenReasoningMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, statusMessage]);

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

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
            )}

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl p-4.5 text-sm transition shadow-sm ${
                isUser
                  ? "bg-sky-600 text-white rounded-tr-sm shadow-sky-600/10"
                  : msg.message_type === "error"
                  ? "bg-rose-950/40 border border-rose-800 text-rose-200 rounded-tl-sm"
                  : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm backdrop-blur-md"
              }`}
            >
              {/* Agent role / reasoning pill */}
              {!isUser && msg.agent_role && msg.agent_role !== "system" && (
                <div className="mb-2.5">
                  <button
                    type="button"
                    onClick={() => toggleReasoning(msg.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/60 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <Cpu className="h-3 w-3 text-sky-400" />
                    <span>Agent: {msg.agent_role}</span>
                    {reasoningOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>

                  {reasoningOpen && (
                    <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 font-mono text-[11px] text-slate-400">
                      <div className="flex items-center gap-1 text-slate-500 mb-1">
                        <Terminal className="h-3 w-3" />
                        <span>Tool Invocation Log</span>
                      </div>
                      <p>Executed autonomous symbol exploration and standards verification pipeline.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Message Content */}
              <div className="prose prose-invert prose-xs max-w-none break-words leading-relaxed">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              {/* Interactive approval card rendered directly on last message or when pending */}
              {!isUser && isLastMessage && pendingApproval && renderApprovalCard(pendingApproval)}
            </div>

            {/* User Avatar */}
            {isUser && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 shadow-sm">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        );
      })}

      {/* Live Streaming State Bubble */}
      {isStreaming && (
        <div className="flex gap-3.5 justify-start">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20 animate-pulse">
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-200 backdrop-blur-md">
            {statusMessage && (
              <div className="flex items-center gap-2 text-xs text-sky-400 font-medium mb-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}

            {streamingContent ? (
              <div className="prose prose-invert prose-xs max-w-none break-words leading-relaxed">
                <ReactMarkdown>{streamingContent}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 py-1 text-slate-500 text-xs">
                <div className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-bounce" />
                <div className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]" />
                <div className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
