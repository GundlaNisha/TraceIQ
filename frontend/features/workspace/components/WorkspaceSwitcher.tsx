"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspaces } from "@/features/workspace/api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  Users,
  ChevronDown,
  User,
  Check,
  Plus,
  Settings,
} from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-violet-100 text-violet-700",
  admin: "bg-blue-100 text-blue-700",
  member: "bg-slate-100 text-slate-600",
  viewer: "bg-slate-100 text-slate-500",
};

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: workspaces } = useWorkspaces();
  const { activeWorkspaceId, activeWorkspaceName, setActiveWorkspace } = useWorkspaceStore();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeLabel = activeWorkspaceId ? activeWorkspaceName : "Personal";
  const hasWorkspaces = (workspaces?.length ?? 0) > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-foreground transition-colors border border-border/50 max-w-[160px]"
        aria-label="Switch workspace"
        aria-expanded={open}
      >
        {activeWorkspaceId ? (
          <Users className="w-3.5 h-3.5 text-accent shrink-0" />
        ) : (
          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="truncate">{activeLabel}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-border/60 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1">
          {/* Personal workspace */}
          <button
            type="button"
            onClick={() => {
              setActiveWorkspace(null, null);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-left transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Personal</p>
              <p className="text-[10px] text-muted-foreground">Private workspace</p>
            </div>
            {!activeWorkspaceId && (
              <Check className="w-3.5 h-3.5 text-accent shrink-0" />
            )}
          </button>

          {hasWorkspaces && (
            <div className="border-t border-border/40 mt-1 pt-1">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Team Workspaces
              </p>
              {workspaces?.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    setActiveWorkspace(ws.id, ws.name);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 text-left transition-colors"
                >
                  <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center shrink-0 text-accent text-[10px] font-bold uppercase">
                    {ws.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{ws.name}</p>
                    {ws.description && (
                      <p className="text-[10px] text-muted-foreground truncate">{ws.description}</p>
                    )}
                  </div>
                  {activeWorkspaceId === ws.id && (
                    <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Footer actions */}
          <div className="border-t border-border/40 mt-1 pt-1">
            <Link
              href="/workspaces"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Manage workspaces
            </Link>
            <Link
              href="/workspaces/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
