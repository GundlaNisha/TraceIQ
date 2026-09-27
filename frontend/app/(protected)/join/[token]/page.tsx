"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  useWorkspaceInvitePreview,
  useAcceptInvite,
  useDeclineInvite,
} from "@/features/workspace/api/queries";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  Shield,
  ShieldCheck,
  Eye,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Clock,
  Mail,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function JoinWorkspacePage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const router = useRouter();
  const { user } = useUser();
  const { setActiveWorkspace } = useWorkspaceStore();

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declinedSuccess, setDeclinedSuccess] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);
  const [acceptedWorkspaceName, setAcceptedWorkspaceName] = useState<string>("");

  const {
    data: preview,
    isLoading,
    isError,
    error,
  } = useWorkspaceInvitePreview(token);

  const { mutate: acceptInvite, isPending: isAccepting } = useAcceptInvite();
  const { mutate: declineInvite, isPending: isDeclining } = useDeclineInvite();

  const userPrimaryEmail =
    user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";

  const handleAccept = () => {
    if (!token) return;
    acceptInvite(token, {
      onSuccess: (ws) => {
        setActiveWorkspace(ws.id, ws.name);
        setAcceptedWorkspaceName(ws.name);
        setAcceptedSuccess(true);
      },
    });
  };

  const handleConfirmDecline = () => {
    if (!token) return;
    declineInvite(token, {
      onSuccess: () => {
        setDeclineModalOpen(false);
        setDeclinedSuccess(true);
      },
    });
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4">
        <div className="bg-white/90 backdrop-blur-xl border border-border/60 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-4 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-accent animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold font-serif text-foreground">
              Verifying Invitation
            </h2>
            <p className="text-xs text-muted-foreground">
              Checking invitation security token and permissions…
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Error / Missing Token State
  if (isError || !preview) {
    const errorMsg =
      error instanceof Error ? error.message : "This invitation is invalid or has expired.";
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4">
        <div className="bg-white/90 backdrop-blur-xl border border-rose-200/70 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-5 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
            <XCircle className="w-7 h-7 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold font-serif text-foreground">
              Invitation Invalid
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {errorMsg}
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-border/50 rounded-2xl text-[11px] text-muted-foreground w-full text-left flex items-start gap-2">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>
              Workspace invitation links are valid for 7 days. If your link expired, please ask the workspace owner to re-send an invite.
            </span>
          </div>
          <div className="pt-2 w-full flex flex-col gap-2">
            <Button
              onClick={() => router.push("/workspaces")}
              className="w-full"
            >
              Go to My Workspaces
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="w-full text-xs text-muted-foreground"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Accepted Success State
  if (acceptedSuccess) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4">
        <div className="bg-white/95 backdrop-blur-xl border border-emerald-200 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-800">
              <Sparkles className="w-3.5 h-3.5" /> Joined Successfully
            </div>
            <h1 className="text-2xl font-bold font-serif text-foreground tracking-tight">
              Welcome to the team!
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              You are now a member of <strong>{acceptedWorkspaceName || preview.workspace_name}</strong>. Your active workspace has been updated.
            </p>
          </div>

          <div className="w-full space-y-2 pt-2">
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full gap-2 shadow-sm"
              size="lg"
            >
              Open Workspace Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/workspaces/${preview.workspace_id}`)}
              className="w-full text-xs"
            >
              View Workspace Overview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Declined Success State
  if (declinedSuccess) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4">
        <div className="bg-white/95 backdrop-blur-xl border border-border/60 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-5 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
            <XCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold font-serif text-foreground">
              Invitation Declined
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              You have declined the invitation to join <strong>{preview.workspace_name}</strong>. This invitation link has been canceled.
            </p>
          </div>
          <div className="pt-2 w-full">
            <Button
              onClick={() => router.push("/workspaces")}
              className="w-full"
            >
              Go to My Workspaces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Already a Member State
  if (preview.is_current_user_member) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4">
        <div className="bg-white/95 backdrop-blur-xl border border-blue-200/80 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100/80 text-blue-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> Already a Member
            </div>
            <h1 className="text-2xl font-bold font-serif text-foreground tracking-tight">
              You're already on this team!
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              You are already a member of <strong>{preview.workspace_name}</strong> with the{" "}
              <strong className="capitalize text-foreground">{preview.current_user_role || "member"}</strong> role.
            </p>
          </div>

          <div className="w-full space-y-2 pt-2">
            <Button
              onClick={() => {
                setActiveWorkspace(preview.workspace_id, preview.workspace_name);
                router.push("/dashboard");
              }}
              className="w-full gap-2 shadow-sm"
              size="lg"
            >
              Open Workspace
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/workspaces")}
              className="w-full text-xs"
            >
              View All Workspaces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 6. Expired State
  if (preview.is_expired) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4">
        <div className="bg-white/90 backdrop-blur-xl border border-amber-200/80 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-5 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold font-serif text-foreground">
              Invitation Expired
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              This invitation to join <strong>{preview.workspace_name}</strong> expired on{" "}
              {new Date(preview.expires_at).toLocaleDateString()}. Please request a new invitation from the team administrator.
            </p>
          </div>
          <div className="pt-2 w-full">
            <Button
              onClick={() => router.push("/workspaces")}
              className="w-full"
            >
              Go to My Workspaces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 7. Active Pending Invitation Preview (Interactive Accept / Decline)
  const isEmailMismatch =
    userPrimaryEmail &&
    preview.email &&
    userPrimaryEmail.toLowerCase() !== preview.email.toLowerCase();

  return (
    <div className="w-full max-w-lg mx-auto py-8 px-4">
      <div className="bg-white/95 backdrop-blur-xl border border-border/70 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        {/* Workspace Brand Banner */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-accent/15 to-purple-500/15 border border-accent/20 flex items-center justify-center text-accent font-serif font-bold text-2xl shrink-0 shadow-xs">
            {preview.workspace_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded-md">
                Workspace Invite
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight truncate">
              {preview.workspace_name}
            </h1>
            {preview.workspace_description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {preview.workspace_description}
              </p>
            )}
          </div>
        </div>

        {/* Invitation Context Box */}
        <div className="rounded-2xl bg-slate-50/80 border border-border/50 p-4 space-y-3">
          {/* Inviter Info */}
          <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> Invited by
            </span>
            <span className="font-semibold text-foreground">
              {preview.invited_by_name || preview.invited_by_email || "A Workspace Admin"}
            </span>
          </div>

          {/* Role Assigned */}
          <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" /> Assigned Role
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-xs capitalize text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
              {preview.role === "admin" && <ShieldCheck className="w-3.5 h-3.5" />}
              {preview.role === "member" && <Sparkles className="w-3.5 h-3.5" />}
              {preview.role === "viewer" && <Eye className="w-3.5 h-3.5" />}
              {preview.role}
            </span>
          </div>

          {/* Expiration */}
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Valid Until
            </span>
            <span className="font-medium text-muted-foreground">
              {new Date(preview.expires_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Role Permissions Callout */}
        <div className="rounded-2xl border border-border/40 p-4 bg-white/70 space-y-1.5">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-accent" />
            What you can do as a {preview.role}:
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {preview.role === "admin" &&
              "Manage workspace settings, link repositories, invite or remove team members, and configure AI PR review bots."}
            {preview.role === "member" &&
              "Trigger AI PR reviews, run impact analyses, link Jira requirements, and browse the traceability matrix."}
            {preview.role === "viewer" &&
              "View PR review reports, test traceability, and impact analyses in read-only mode."}
          </p>
        </div>

        {/* Email Mismatch Notification (Safe heads up) */}
        {isEmailMismatch && (
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-amber-900">Email notice</p>
              <p className="text-[11px] leading-relaxed">
                This invitation was sent to <strong>{preview.email}</strong>, but you are signed in as <strong>{userPrimaryEmail}</strong>. Accepting will link your current account.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons: Accept / Decline */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeclineModalOpen(true)}
            disabled={isAccepting || isDeclining}
            className="sm:w-1/3 order-2 sm:order-1 border-border/70 text-slate-700 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
          >
            Decline
          </Button>

          <Button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="flex-1 order-1 sm:order-2 gap-2 shadow-sm"
            size="default"
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Accept Invitation
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog: Decline Invitation Modal */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-1">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold font-serif text-foreground">
              Decline invitation to {preview.workspace_name}?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              If you decline this invitation, the security link will be canceled and you won't be able to join using this link. The workspace administrator will have to send you a new invite if you change your mind.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 gap-2 flex-col sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isDeclining}
              onClick={() => setDeclineModalOpen(false)}
              className="text-xs"
            >
              Keep Invitation
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeclining}
              onClick={handleConfirmDecline}
              className="text-xs gap-1.5"
            >
              {isDeclining ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Declining…
                </>
              ) : (
                "Yes, Decline Invitation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
