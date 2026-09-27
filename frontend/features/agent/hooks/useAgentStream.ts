"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { API_BASE_URL } from "@/lib/api/config";
import type { StreamEvent } from "../types";

interface UseAgentStreamOptions {
  sessionId: string | null;
  onEvent?: (event: StreamEvent) => void;
  onDone?: () => void;
  onApprovalRequired?: (approval: any) => void;
}

export function useAgentStream({
  sessionId,
  onEvent,
  onDone,
  onApprovalRequired,
}: UseAgentStreamOptions) {
  const { getToken } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async () => {
    if (!sessionId) return;

    // Abort previous stream if active
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);
    setStatusMessage("Connecting to agent stream...");
    setStreamingContent("");
    setError(null);

    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        Accept: "text/event-stream",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/agent/sessions/${sessionId}/stream`, {
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Stream connection failed: HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          if (!block.trim()) continue;
          let eventType = "message";
          let dataStr = "";

          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) {
              eventType = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              dataStr += line.replace("data:", "").trim();
            }
          }

          if (dataStr) {
            try {
              const parsed: StreamEvent = JSON.parse(dataStr);
              onEvent?.(parsed);

              if (parsed.type === "token" && parsed.data?.content) {
                setStreamingContent((prev) => prev + parsed.data.content);
              } else if (parsed.type === "status" && parsed.data?.message) {
                setStatusMessage(parsed.data.message);
              } else if (parsed.type === "approval_request") {
                setStatusMessage("Waiting for human confirmation...");
                onApprovalRequired?.(parsed.data);
              } else if (parsed.type === "done") {
                setStatusMessage(null);
                setIsStreaming(false);
                onDone?.();
              } else if (parsed.type === "error") {
                setError(parsed.data?.error || "An error occurred");
                setIsStreaming(false);
              }
            } catch {
              // Ignore non-json chunks
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to stream agent response");
      }
    } finally {
      setIsStreaming(false);
      setStatusMessage(null);
    }
  }, [sessionId, getToken, onEvent, onDone, onApprovalRequired]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStatusMessage(null);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isStreaming,
    statusMessage,
    streamingContent,
    error,
    startStream,
    stopStream,
  };
}
