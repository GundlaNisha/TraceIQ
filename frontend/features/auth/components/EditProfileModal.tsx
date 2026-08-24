"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useUpdateProfile, type BackendUser } from "../api/queries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Mail,
  Sparkles,
} from "lucide-react";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backendUser?: BackendUser | null;
}

export function EditProfileModal({
  open,
  onOpenChange,
  backendUser,
}: EditProfileModalProps) {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const { mutateAsync: updateBackendProfile, isPending: isBackendPending } = useUpdateProfile();

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize values when user loads or modal opens
  useEffect(() => {
    if (open && user) {
      setUsername(user.username || backendUser?.name || user.firstName || "");
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [open, user, backendUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedUsername = username.trim();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedUsername && !trimmedFirst) {
      setErrorMessage("Please enter a username or display name.");
      setIsSaving(false);
      return;
    }

    try {
      // 1. Update in Clerk
      const clerkUpdates: { username?: string; firstName?: string; lastName?: string } = {};
      if (trimmedUsername) clerkUpdates.username = trimmedUsername;
      if (trimmedFirst) clerkUpdates.firstName = trimmedFirst;
      if (trimmedLast) clerkUpdates.lastName = trimmedLast;

      try {
        await user.update(clerkUpdates);
      } catch (clerkErr: any) {
        // If username is not enabled in Clerk instance or format fails, fallback to first/last name
        const msg = clerkErr?.errors?.[0]?.message || clerkErr?.message;
        if (msg && !msg.toLowerCase().includes("username is not supported")) {
          // If it's a real validation error (e.g. username taken or format error), show it
          if (msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("character") || msg.toLowerCase().includes("length")) {
            throw new Error(msg);
          }
        }
        // If username update failed due to config, try first/last name
        if (trimmedFirst || trimmedLast) {
          await user.update({
            firstName: trimmedFirst || undefined,
            lastName: trimmedLast || undefined,
          });
        }
      }

      // 2. Sync to Backend Database
      const displayName = trimmedUsername || `${trimmedFirst} ${trimmedLast}`.trim() || "User";
      await updateBackendProfile({ name: displayName });

      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => {
        setSuccessMessage(null);
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || err?.message || "Failed to update profile. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress || backendUser?.email || "No email";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white p-6 rounded-2xl shadow-xl border border-border/60">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <User className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Edit Profile & Username
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Update your account display name and personal details.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Feedback Banners */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Email (Read-only) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </label>
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-border/70 rounded-xl text-xs text-slate-700">
              <span className="truncate">{primaryEmail}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            </div>
          </div>

          {/* Username / Display Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Username / Display Name</span>
              <span className="text-[10px] font-normal text-muted-foreground">Used across reviews & reports</span>
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alex_dev or Alex Morgan"
              className="bg-white text-xs h-9 rounded-xl border-border/70 focus-visible:ring-accent"
              disabled={isSaving || !isLoaded}
              required
            />
          </div>

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">First Name</label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="bg-white text-xs h-9 rounded-xl border-border/70 focus-visible:ring-accent"
                disabled={isSaving || !isLoaded}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Last Name</label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="bg-white text-xs h-9 rounded-xl border-border/70 focus-visible:ring-accent"
                disabled={isSaving || !isLoaded}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                openUserProfile();
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Manage Clerk Account
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="text-xs h-8 px-3 rounded-xl border-border/70"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving || isBackendPending || !isLoaded}
                className="bg-accent hover:bg-accent/90 text-white text-xs font-semibold h-8 px-4 rounded-xl shadow-sm gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
