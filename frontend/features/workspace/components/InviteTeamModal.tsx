"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useInviteMember } from "@/features/workspace/api/queries";
import { Users, Copy, Check, Loader2, Mail, ExternalLink } from "lucide-react";

interface InviteTeamModalProps {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onClose: () => void;
}

export function InviteTeamModal({
  workspaceId,
  workspaceName,
  open,
  onClose,
}: InviteTeamModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string>("");
  const [lastInvitedRole, setLastInvitedRole] = useState<string>("member");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutate: invite, isPending } = useInviteMember();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const targetEmail = email.trim();
    const targetRole = role;
    invite(
      { workspaceId, email: targetEmail, role: targetRole },
      {
        onSuccess: (data) => {
          const link = `${window.location.origin}/join/${data.token}`;
          setInviteLink(link);
          setLastInvitedEmail(targetEmail);
          setLastInvitedRole(targetRole);
          setEmail("");
        },
        onError: (err: any) => {
          setError(err.message || "Failed to send invitation");
        },
      }
    );
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail("");
    setRole("member");
    setInviteLink(null);
    setLastInvitedEmail("");
    setError(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-border/40 shadow-2xl sm:rounded-2xl p-6 sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold font-serif tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            Invite to {workspaceName}
          </DialogTitle>
        </DialogHeader>

        {!inviteLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Email address <span className="text-rose-500">*</span>
              </Label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-full px-3 py-2 rounded-xl border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Role</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["viewer", "member", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all capitalize ${
                      role === r
                        ? "bg-accent text-white border-accent shadow-sm"
                        : "bg-slate-50 text-muted-foreground border-border/50 hover:border-accent/40"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {role === "viewer" && "Can view results only — no triggers."}
                {role === "member" && "Can trigger reviews and analyses."}
                {role === "admin" && "Can manage members and repositories."}
              </p>
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
              <Button type="button" variant="outline" onClick={handleClose} className="border-border/60">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !email} className="gap-2">
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {isPending ? "Sending…" : "Generate Invite Link"}
              </Button>
            </div>
          </form>
        ) : (
          /* Invite link ready */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Invite link ready
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full">
                  {lastInvitedRole}
                </span>
              </div>
              <p className="text-xs text-emerald-700">
                Share this link with <strong>{lastInvitedEmail || "your teammate"}</strong>. It expires in 7 days.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-2 rounded-xl border border-border/60 text-xs bg-slate-50 text-muted-foreground font-mono truncate"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 text-xs font-semibold hover:bg-slate-50 transition-colors shrink-0"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy</>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href={inviteLink || "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Test / Open Invitation Link
              </a>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteLink(null)}
                className="border-border/60 text-xs"
              >
                Invite Another
              </Button>
              <Button type="button" onClick={handleClose} className="text-xs">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
