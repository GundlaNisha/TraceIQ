"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { GitBranch, CheckCircle2, Unlink } from "lucide-react";
import { useGithubStatus, useDisconnectGithub } from "../api/queries";
import Link from "next/link";

export function ConnectGithubButton() {
  const { user } = useUser();
  const { data } = useGithubStatus();
  const { mutate: disconnect, isPending } = useDisconnectGithub();
  const [isHovered, setIsHovered] = useState(false);
  
  if (!user) return null;
  
  // Hardcoded to traceiq-official or driven by env
  const appSlug = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "traceiq-official";
  const installUrl = `https://github.com/apps/${appSlug}/installations/new?state=${user.id}`;
  
  if (data?.connected) {
    return (
      <Button 
        variant="outline" 
        className={`gap-2 font-semibold shadow-sm transition-colors w-[170px] ${
          isHovered 
            ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700' 
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => disconnect()}
        disabled={isPending}
      >
        {isHovered ? <Unlink className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
        {isHovered ? (isPending ? "Disconnecting..." : "Disconnect GitHub") : "GitHub Connected"}
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      className="gap-2 border-border/60 shadow-sm font-semibold hover:bg-slate-50 transition-colors"
      onClick={() => window.location.href = installUrl}
    >
      <GitBranch className="w-4 h-4" />
      Connect GitHub
    </Button>
  );
}
