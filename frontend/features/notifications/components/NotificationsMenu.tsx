"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useMyWorkspaceInvitations,
  useAcceptInvite,
  useDeclineInvite,
  type UserInvitation,
} from "@/features/workspace/api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  Bell,
  Check,
  X,
  Loader2,
  Users,
  Shield,
  Sparkles,
  Eye,
  ExternalLink,
  Mail,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [actingToken, setActingToken] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: invitations, isLoading } = useMyWorkspaceInvitations();
  const { mutate: acceptInvite } = useAcceptInvite();
  const { mutate: declineInvite } = useDeclineInvite();
  const { setActiveWorkspace } = useWorkspaceStore();

  const pendingCount = invitations?.length || 0;

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

  const handleAccept = (inv: UserInvitation) => {
    setActingToken(inv.token);
    acceptInvite(inv.token, {
      onSuccess: (ws) => {
        setActiveWorkspace(ws.id, ws.name);
        setActingToken(null);
        setOpen(false);
        router.push("/dashboard");
      },
      onError: () => {
        setActingToken(null);
      },
    });
  };

  const handleDecline = (inv: UserInvitation) => {
    if (!confirm(`Are you sure you want to decline the invitation to join ${inv.workspace_name}?`)) {
      return;
    }
    setActingToken(inv.token);
    declineInvite(inv.token, {
      onSettled: () => {
        setActingToken(null);
      },
    });
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors border border-transparent focus:outline-none focus:ring-2 focus:ring-accent/30"
        title={pendingCount > 0 ? `${pendingCount} pending notification${pendingCount > 1 ? "s" : ""}` : "Notifications"}
        aria-label="View notifications"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {pendingCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-accent rounded-full leading-none shadow-xs">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover Card */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-xl border border-border/70 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Notifications</span>
              {pendingCount > 0 && (
                <span className="text-[10px] font-semibold bg-accent/15 text-accent px-2 py-0.5 rounded-full">
                  {pendingCount} new
                </span>
              )}
            </div>
            <Link
              href="/workspaces"
              onClick={() => setOpen(false)}
              className="text-[11px] text-muted-foreground hover:text-accent font-medium transition-colors"
            >
              Workspaces →
            </Link>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <span className="text-xs">Loading notifications…</span>
              </div>
            ) : pendingCount > 0 ? (
              invitations?.map((inv) => {
                const isActing = actingToken === inv.token;
                return (
                  <div key={inv.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                    {/* Workspace & Role Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                        {inv.workspace_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {inv.workspace_name}
                          </p>
                          <span className="text-[10px] font-semibold capitalize bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md shrink-0">
                            {inv.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {inv.invited_by_name || inv.invited_by_email ? (
                            <>
                              Invited by <strong>{inv.invited_by_name || inv.invited_by_email}</strong>
                            </>
                          ) : (
                            "Invited you to collaborate"
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Link
                        href={`/join/${inv.token}`}
                        onClick={() => setOpen(false)}
                        className="text-[11px] text-accent hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Preview
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isActing}
                          onClick={() => handleDecline(inv)}
                          className="h-7 px-2.5 text-[11px] border-border/60 hover:text-rose-600 hover:bg-rose-50"
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          disabled={isActing}
                          onClick={() => handleAccept(inv)}
                          className="h-7 px-3 text-[11px] gap-1 shadow-2xs"
                        >
                          {isActing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Accept
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 px-4 text-center flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">You're all caught up!</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                    No pending notifications. Invitations to join new workspaces will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50/80 border-t border-border/50 text-center">
            <Link
              href="/workspaces"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <Users className="w-3 h-3" />
              Manage all team workspaces
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
