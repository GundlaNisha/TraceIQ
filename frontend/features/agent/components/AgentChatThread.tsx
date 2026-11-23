"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AgentMarkdown } from "./AgentMarkdown";
import {
  Sparkles,
  User,
  ChevronDown,
  ChevronRight,
  Terminal,
  Loader2,
  Cpu,
  FolderGit2,
  Layers,
  GitPullRequest,
  Compass,
  Zap,
  ShieldCheck,
  FileCheck2,
  ArrowDown,
  Bot,
} from "lucide-react";
import type { AgentApproval, AgentMessage } from "../types";
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
  onQuickAction?: (prompt: string) => void;
  activeRepoName?: string;
  activeReqTitle?: string;
}

const STARTER_CARDS = [
  {
    icon: Compass,
    title: "Find Starting Points",
    desc: "Locate classes, files, and functions to begin implementing.",
    prompt: "Where should I start in the codebase to implement this requirement?",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    icon: Zap,
    title: "Trace Blast Radius",
    desc: "Calculate 2-hop downstream callers, affected routes, and regression risk.",
    prompt: "What is the estimated blast radius and downstream dependencies for this change?",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    icon: ShieldCheck,
    title: "Pre-Review Standards",
    desc: "Audit code against security guidelines and verify test coverage.",
    prompt: "Run an automated pre-review audit against our coding standards and security policies.",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    icon: FileCheck2,
    title: "Draft PR Description",
    desc: "Generate a production-ready PR summary linked to acceptance criteria.",
    prompt: "Generate a production-ready Pull Request description linked to this requirement.",
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
];

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
  onQuickAction,
  activeRepoName,
  activeReqTitle,
}: AgentChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [openReasoningMap, setOpenReasoningMap] = useState<Record<string, boolean>>({});
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const toggleReasoning = (id: string) => {
    setOpenReasoningMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollBottom(!isNearBottom);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const isEmpty = messages.length === 0 && !optimisticUserMessage && !isStreaming;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="relative flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-4"
    >
      <div className="max-w-4xl lg:max-w-5xl mx-auto w-full space-y-3.5">
        {/* Compact Empty State */}
        {isEmpty && (
          <div className="py-6 md:py-10 text-center space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-xs border border-accent/20">
                <Bot className="h-5 w-5 text-emerald-300" />
              </div>
              <h2 className="text-base md:text-lg font-bold font-serif text-foreground tracking-tight">
                TraceIQ Codebase Assistant
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AST dependency graphs, blast radius analysis, and automated PR reviews.
              </p>

              {/* Active Grounding Pill */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-foreground border border-border/70">
                  <FolderGit2 className="h-3 w-3 text-accent" />
                  <span>{activeRepoName || "No repo selected"}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700 border border-purple-200">
                  <Layers className="h-3 w-3" />
                  <span>{activeReqTitle || "No story linked"}</span>
                </span>
              </div>
            </div>

            {/* Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left max-w-2xl mx-auto">
              {STARTER_CARDS.map((card, idx) => {
                const IconComponent = card.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onQuickAction?.(card.prompt)}
                    className="group flex flex-col justify-between rounded-xl border border-border/70 bg-white p-3.5 transition-all hover:border-accent/40 hover:shadow-xs hover:-translate-y-0.5 text-left cursor-pointer"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className={`rounded-lg p-1.5 border ${card.color}`}>
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-accent transition">
                          Start &rarr;
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground group-hover:text-accent transition">
                        {card.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {card.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg, index) => {
          const isUser = msg.sender === "user";
          const isLastMessage = index === messages.length - 1;
          const reasoningOpen = !!openReasoningMap[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {/* Agent Avatar */}
              {!isUser && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-2xs border border-accent/20 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                className={`w-full max-w-[92%] md:max-w-[88%] rounded-xl p-3.5 text-[12px] leading-relaxed transition shadow-2xs ${
                  isUser
                    ? "bg-accent text-white rounded-tr-xs shadow-accent/10"
                    : msg.message_type === "error"
                    ? "bg-rose-50 border border-rose-200 text-rose-800 rounded-tl-xs"
                    : "bg-white border border-border/70 text-foreground rounded-tl-xs shadow-2xs"
                }`}
              >
                {/* Agent role / reasoning pill */}
                {!isUser && msg.agent_role && msg.agent_role !== "system" && (
                  <div className="mb-1.5">
                    <button
                      type="button"
                      onClick={() => toggleReasoning(msg.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Cpu className="h-2.5 w-2.5 text-accent" />
                      <span>Agent: {msg.agent_role}</span>
                      {reasoningOpen ? (
                        <ChevronDown className="h-2.5 w-2.5" />
                      ) : (
                        <ChevronRight className="h-2.5 w-2.5" />
                      )}
                    </button>

                    {reasoningOpen && (
                      <div className="mt-1 rounded-lg border border-border/60 bg-[#FAF8F5] p-2 font-mono text-[10px] text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1 text-accent font-semibold">
                          <Terminal className="h-3 w-3" />
                          <span>Tool Invocation Log</span>
                        </div>
                        {Array.isArray(msg.artifacts?.tool_invocations) && msg.artifacts.tool_invocations.length > 0 ? (
                          <div className="space-y-0.5 pt-0.5">
                            {msg.artifacts.tool_invocations.map((tool: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 text-slate-700">
                                <span className="text-emerald-600 font-bold">&bull;</span>
                                <span>{tool}()</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-600">
                            {msg.agent_role === "code_explorer"
                              ? "Executed AST symbol lookup and 2-hop blast radius graph traversal across dependency tables."
                              : msg.agent_role === "pre_review"
                              ? "Audited code diff against security standards, quality rules, and unit test coverage."
                              : msg.agent_role === "pr_drafter"
                              ? "Synthesized requirement-linked Pull Request description and impact checklist."
                              : msg.agent_role === "verify_implementation"
                              ? "Verified acceptance criteria against AST symbols and repository files."
                              : msg.agent_role === "conversational_chat"
                              ? "Processed conversation query with workspace and codebase context."
                              : "Executed autonomous agent reasoning and tool invocation across workspace context."}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div
                  className={`max-w-none break-words ${
                    isUser
                      ? "text-white"
                      : "text-foreground"
                  }`}
                >
                  <AgentMarkdown content={msg.content} isUser={isUser} />
                </div>

                {/* Tagged Context Chips if attached to message */}
                {msg.artifacts?.tagged_entities &&
                  Array.isArray(msg.artifacts.tagged_entities) &&
                  msg.artifacts.tagged_entities.length > 0 && (
                    <div
                      className={`flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t ${
                        isUser ? "border-white/20" : "border-border/50"
                      }`}
                    >
                      <span
                        className={`text-[9.5px] font-semibold uppercase tracking-wider ${
                          isUser ? "text-white/70" : "text-muted-foreground"
                        }`}
                      >
                        Context:
                      </span>
                      {msg.artifacts.tagged_entities.map((tag: any, tIdx: number) => (
                        <span
                          key={tIdx}
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border shadow-2xs ${
                            isUser
                              ? "bg-white/15 text-white border-white/30"
                              : tag.type === "repo"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : tag.type === "req"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {tag.type === "repo" && <FolderGit2 className="h-2.5 w-2.5 shrink-0" />}
                          {tag.type === "req" && <Layers className="h-2.5 w-2.5 shrink-0" />}
                          {tag.type === "pr" && <GitPullRequest className="h-2.5 w-2.5 shrink-0" />}
                          <span className="truncate max-w-[160px]">{tag.label || tag.name || tag.id}</span>
                        </span>
                      ))}
                    </div>
                  )}

                {/* Interactive approval card */}
                {!isUser && isLastMessage && pendingApproval && renderApprovalCard(pendingApproval)}
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-foreground border border-border/60 shadow-2xs mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {/* Optimistic User Message Bubble */}
        {showOptimisticMessage && (
          <div className="flex gap-2.5 justify-end">
            <div className="w-full max-w-[92%] md:max-w-[88%] rounded-xl rounded-tr-xs p-3.5 text-[12px] bg-accent text-white shadow-accent/10 shadow-2xs">
              <AgentMarkdown content={optimisticUserMessage} isUser={true} />
            </div>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-foreground border border-border/60 shadow-2xs mt-0.5">
              <User className="h-3.5 w-3.5" />
            </div>
          </div>
        )}

        {/* Live Streaming State Bubble */}
        {isStreaming && (
          <div className="flex gap-2.5 justify-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-2xs border border-accent/20 animate-pulse mt-0.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
            </div>

            <div className="w-full max-w-[92%] md:max-w-[88%] rounded-xl rounded-tl-xs border border-border/70 bg-white p-3.5 text-[12px] text-foreground shadow-2xs">
              {statusMessage && (
                <div className="flex items-center gap-1.5 text-[11px] text-accent font-semibold mb-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-accent" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {streamingContent ? (
                <AgentMarkdown content={streamingContent} />
              ) : (
                <div className="flex items-center gap-1 py-0.5 text-muted-foreground text-xs">
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

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="fixed bottom-20 right-1/2 translate-x-1/2 md:translate-x-0 md:right-8 z-20 flex items-center gap-1.5 rounded-full border border-border/80 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-md backdrop-blur-md hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowDown className="h-3 w-3 text-accent" />
          <span>Latest</span>
        </button>
      )}
    </div>
  );
}
