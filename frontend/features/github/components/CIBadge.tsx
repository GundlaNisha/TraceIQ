"use client";

import { CheckCircle2, XCircle, Clock, MinusCircle } from "lucide-react";
import { usePRChecks } from "../api/queries";
import type { CICheckState } from "@/lib/types/github";

const STATE_STYLE: Record<
  CICheckState,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  success: {
    label: "CI passing",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    Icon: CheckCircle2,
  },
  failure: {
    label: "CI failing",
    className: "bg-rose-50 text-rose-700 border-rose-200/60",
    Icon: XCircle,
  },
  pending: {
    label: "CI running",
    className: "bg-amber-50 text-amber-700 border-amber-200/60",
    Icon: Clock,
  },
  unknown: {
    label: "No CI",
    className: "bg-slate-100 text-slate-500 border-slate-200",
    Icon: MinusCircle,
  },
};

export function CIBadge({
  repositoryId,
  prNumber,
}: {
  repositoryId?: string | null;
  prNumber: number;
}) {
  const { data, isLoading } = usePRChecks(repositoryId, prNumber);

  if (!repositoryId) return null;
  if (isLoading || !data) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-400 border border-slate-200">
        <Clock className="w-3 h-3 animate-pulse" />
        CI…
      </span>
    );
  }

  const style = STATE_STYLE[data.state] ?? STATE_STYLE.unknown;
  const { Icon } = style;
  const detail =
    data.total > 0
      ? `${data.success} passed${data.failure > 0 ? `, ${data.failure} failed` : ""}${data.pending > 0 ? `, ${data.pending} running` : ""}`
      : "No check runs reported";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${style.className}`}
      title={`${style.label} — ${detail}${data.head_sha ? ` (${data.head_sha})` : ""}`}
    >
      <Icon
        className={`w-3 h-3 ${data.state === "pending" ? "animate-spin" : ""}`}
      />
      {data.state === "success"
        ? `CI ${data.success}/${data.total}`
        : data.state === "failure"
          ? `CI ${data.failure} failed`
          : data.state === "pending"
            ? "CI running"
            : "No CI"}
    </span>
  );
}
