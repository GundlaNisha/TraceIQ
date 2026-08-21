"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { GitBranch, CheckCircle2, Unlink, Settings, ExternalLink } from "lucide-react";
import { useGithubStatus, useDisconnectGithub } from "../api/queries";

export function ConnectGithubButton() {
  const { user } = useUser();
  const { data } = useGithubStatus();
  const { mutate: disconnect, isPending } = useDisconnectGithub();
  const [isHovered, setIsHovered] = useState(false);

  if (!user) return null;

  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "traceiq-official";
  const installUrl = `https://github.com/apps/${appSlug}/installations/new?state=${user.id}`;
  const settingsUrl =
    data?.settings_url ||
    (data?.installation_id
      ? `https://github.com/settings/installations/${data.installation_id}`
      : installUrl);

  if (data?.connected) {
    return (
      <div className="flex items-center gap-2">
        {/* Manage GitHub Access / Switch to All Repositories Link */}
        <a
          href={settingsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors shadow-sm"
          title="Switch to 'All Repositories' or grant access to more repos on GitHub"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Manage GitHub Access</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>

        {/* Connected Badge & Disconnect */}
        <Button
          variant="outline"
          className={`gap-1.5 font-semibold text-xs h-8 px-3 rounded-xl shadow-sm transition-colors ${
            isHovered
              ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => disconnect()}
          disabled={isPending}
        >
          {isHovered ? <Unlink className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {isHovered ? (isPending ? "Disconnecting..." : "Disconnect") : "GitHub Connected"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      className="gap-2 border-border/60 shadow-sm font-semibold text-xs h-8 px-3.5 rounded-xl hover:bg-slate-50 transition-colors"
      onClick={() => (window.location.href = installUrl)}
    >
      <GitBranch className="w-4 h-4 text-accent" />
      Connect GitHub
    </Button>
  );
}
