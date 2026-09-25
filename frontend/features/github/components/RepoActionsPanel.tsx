"use client";

import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Activity,
  Timer,
  Layers,
  AlertTriangle,
  HeartPulse,
  FlaskConical,
  Flame,
} from "lucide-react";
import { useRepoActions } from "../api/queries";
import { formatTimeAgo } from "@/lib/utils";
import type { ActionsBucket } from "@/lib/types/github";

const BUCKET_ICON: Record<ActionsBucket, typeof CheckCircle2> = {
  success: CheckCircle2,
  failure: XCircle,
  pending: Clock,
};

const BUCKET_COLOR: Record<ActionsBucket, string> = {
  success: "text-emerald-500",
  failure: "text-rose-500",
  pending: "text-amber-500",
};

function formatDuration(totalSeconds: number | null | undefined) {
  if (totalSeconds == null) return "—";
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  if (m < 60) {
    const s = totalSeconds % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm === 0 ? `${h}h` : `${h}h ${rm}m`;
}

export function RepoActionsPanel({ repositoryId }: { repositoryId: string }) {
  const { data, isLoading, isError } = useRepoActions(repositoryId);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-white/80 p-6 animate-pulse">
        <p className="text-xs font-semibold text-muted">
          Loading Actions history…
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-border/40 bg-white/80 p-6 text-center">
        <p className="text-xs text-muted">
          Could not load GitHub Actions history for this repository.
        </p>
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-white/80 p-6 text-center">
        <Activity className="w-6 h-6 mx-auto mb-2 text-muted/40" />
        <p className="text-sm font-semibold text-foreground">No workflow runs yet</p>
        <p className="text-xs text-muted mt-1">
          Push a commit or open a PR on this repository to see Actions history here.
        </p>
      </div>
    );
  }

  const stats = [
    {
      label: "Success rate",
      value: data.success_rate != null ? `${data.success_rate}%` : "—",
      sub: `${data.success}/${data.completed} completed`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50/60 border-emerald-100",
    },
    {
      label: "Avg duration",
      value: formatDuration(data.avg_duration_s),
      sub: "per completed run",
      icon: Timer,
      color: "text-blue-600",
      bg: "bg-blue-50/60 border-blue-100",
    },
    {
      label: "Runs tracked",
      value: String(data.total),
      sub: `${data.pending} in progress`,
      icon: Layers,
      color: "text-slate-600",
      bg: "bg-slate-50/60 border-slate-200",
    },
    {
      label: "Failing",
      value: String(data.failure),
      sub: "needs attention",
      icon: AlertTriangle,
      color: "text-rose-600",
      bg: "bg-rose-50/60 border-rose-100",
    },
  ];

  return (
    <div className="rounded-2xl border border-border/40 bg-white/80 backdrop-blur-md shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border/40">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          GitHub Actions — CI Health
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Last {data.total} workflow runs for the selected repository.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                {label}
              </p>
            </div>
            <p className="text-2xl font-bold font-serif text-foreground mt-1">
              {value}
            </p>
            <p className="text-[11px] text-muted mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Reliability: MTTR + flaky workflows + streaks */}
      <div className="mx-5 mb-5 rounded-xl border border-border/40 bg-slate-50/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <HeartPulse className="w-4 h-4 text-accent" />
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Reliability
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Mean time to recovery
            </p>
            <p className="text-xl font-bold font-serif text-foreground mt-0.5">
              {formatDuration(data.reliability.mttr_s)}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              {data.reliability.recovered_episodes === 0
                ? "No failure→recovery episodes yet"
                : `${data.reliability.recovered_episodes} recovered episode${data.reliability.recovered_episodes === 1 ? "" : "s"}`}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />
              Flaky workflows
            </p>
            {data.reliability.flaky_workflows.length === 0 ? (
              <p className="text-xs text-muted mt-1.5">
                None detected — no workflow has failed then passed on a later run.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1.5">
                {data.reliability.flaky_workflows.map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center justify-between gap-2 text-xs bg-white rounded-lg border border-amber-200/70 px-2.5 py-1.5"
                  >
                    <span className="font-semibold text-foreground truncate">
                      {f.name}
                    </span>
                    <span className="font-mono text-amber-700 shrink-0">
                      {f.recoveries}× recovered
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {Object.keys(data.by_workflow).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/40">
            {Object.entries(data.by_workflow).map(([name, w]) => (
              <span
                key={name}
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border ${
                  w.streak_type === "failing"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
                title={`${name}: ${w.success}/${w.total} passed${w.last_rate != null ? `, last-10 rate ${w.last_rate}%` : ""}`}
              >
                {w.streak_type === "failing" ? (
                  <Flame className="w-3 h-3" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                {name} · {w.streak || 0} {w.streak_type ?? "—"} in a row
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 flex flex-col gap-2">
        {data.runs.slice(0, 10).map((run) => {
          const Icon = BUCKET_ICON[run.bucket];
          return (
            <div
              key={run.id ?? `${run.name}-${run.created_at}`}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border/40 bg-white hover:border-accent/30 transition-colors"
            >
              <Icon className={`w-4 h-4 shrink-0 ${BUCKET_COLOR[run.bucket]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {run.name}
                </p>
                <p className="text-[11px] text-muted font-mono truncate">
                  {run.branch ?? "—"}
                  {run.event ? ` · ${run.event}` : ""}
                  {run.actor ? ` · ${run.actor}` : ""}
                  {run.created_at ? ` · ${formatTimeAgo(run.created_at)}` : ""}
                </p>
              </div>
              <span className="text-[11px] font-mono text-muted shrink-0 hidden sm:inline">
                {formatDuration(run.duration_s)}
              </span>
              {run.html_url && (
                <a
                  href={run.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-slate-100 transition-colors shrink-0"
                  title="Open run on GitHub"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
