"use client";

import React from "react";
import { Info, Lightbulb, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";

interface Props {
  type?: "note" | "tip" | "warning" | "important" | "danger" | "success";
  title?: string;
  children: React.ReactNode;
}

export function DocsCallout({ type = "note", title, children }: Props) {
  const styles = {
    note: {
      bg: "bg-blue-50/80 border-blue-200 text-blue-900",
      icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
      defaultTitle: "Note",
    },
    tip: {
      bg: "bg-emerald-50/80 border-emerald-200 text-emerald-950",
      icon: <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
      defaultTitle: "Tip",
    },
    warning: {
      bg: "bg-amber-50/80 border-amber-200 text-amber-950",
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
      defaultTitle: "Warning",
    },
    important: {
      bg: "bg-purple-50/80 border-purple-200 text-purple-950",
      icon: <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />,
      defaultTitle: "Important",
    },
    danger: {
      bg: "bg-rose-50/80 border-rose-200 text-rose-950",
      icon: <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
      defaultTitle: "Caution",
    },
    success: {
      bg: "bg-emerald-50/80 border-emerald-200 text-emerald-950",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
      defaultTitle: "Success",
    },
  }[type];

  return (
    <div className={`my-4 p-4 rounded-xl border ${styles.bg} text-xs leading-relaxed shadow-xs flex gap-3 items-start`}>
      {styles.icon}
      <div className="flex-1 space-y-1">
        <div className="font-semibold text-xs uppercase tracking-wider font-mono">
          {title || styles.defaultTitle}
        </div>
        <div className="text-foreground/90 font-sans text-xs">{children}</div>
      </div>
    </div>
  );
}
