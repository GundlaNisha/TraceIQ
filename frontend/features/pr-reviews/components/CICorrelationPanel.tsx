"use client";

import { CheckCircle2, XCircle, AlertTriangle, FlaskConical } from "lucide-react";
import { useCICorrelation } from "../api/queries";

export function CICorrelationPanel({ reviewId }: { reviewId: string }) {
  const { data, isLoading } = useCICorrelation(reviewId);

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-border/50 bg-white/60 p-5 animate-pulse">
        <p className="text-xs font-semibold text-muted">
          Checking CI against blast radius…
        </p>
      </div>
    );
  }

  const { verdict, in_blast_radius, unrelated } = data.correlation;

  if (verdict === "clean") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            CI clean
            {data.ci.total > 0 && ` — ${data.ci.success}/${data.ci.total} checks passing`}
            {data.ci.head_sha && (
              <span className="font-mono font-normal"> ({data.ci.head_sha})</span>
            )}
          </p>
          <p className="text-xs text-emerald-700/80 mt-0.5">
            No failing checks. Safe to weigh the AI findings on their own merits.
          </p>
        </div>
      </div>
    );
  }

  if (verdict === "in_scope") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-800">
              Failing CI overlaps the blast radius — do not merge yet
            </p>
            <div className="mt-2.5 flex flex-col gap-2">
              {in_blast_radius.map((entry) => (
                <div
                  key={entry.check_name}
                  className="rounded-xl bg-white/80 border border-rose-200/70 px-3 py-2"
                >
                  <p className="text-xs font-bold font-mono text-rose-700">
                    ✕ {entry.check_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Touches predicted files:{" "}
                    {entry.matched_files.map((f) => (
                      <code
                        key={f}
                        className="font-mono text-[11px] bg-rose-100/70 text-rose-800 px-1.5 py-0.5 rounded mr-1"
                      >
                        {f}
                      </code>
                    ))}
                  </p>
                </div>
              ))}
              {unrelated.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Also failing outside impact:{" "}
                  <span className="font-mono">{unrelated.join(", ")}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-800">
          CI failing, but outside the predicted blast radius
        </p>
        <p className="text-xs text-amber-700/90 mt-1 flex items-center gap-1.5 flex-wrap">
          <FlaskConical className="w-3.5 h-3.5" />
          <span className="font-mono">{unrelated.join(", ")}</span>
          <span>— likely infra flake or unrelated suite, still worth a look.</span>
        </p>
      </div>
    </div>
  );
}
