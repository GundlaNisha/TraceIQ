"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApiClient } from "@/lib/api/client";
import { useWorkspaceStore } from "@/stores/workspace";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JoinWorkspacePage() {
  const { token } = useParams<{ token: string }>();
  const { fetchApi } = useApiClient();
  const { setActiveWorkspace } = useWorkspaceStore();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) return;
    fetchApi(`/api/v1/workspaces/join/${token}`, {})
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to join workspace");
        }
        return res.json();
      })
      .then((ws) => {
        setWorkspace(ws);
        setActiveWorkspace(ws.id, ws.name);
        setStatus("success");
      })
      .catch((err: any) => {
        setErrorMsg(err.message || "Something went wrong");
        setStatus("error");
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
          <p className="text-sm font-medium">Accepting invitation…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full flex flex-col items-center gap-4 text-center p-8 bg-white rounded-2xl border border-rose-200 shadow-sm">
          <XCircle className="w-12 h-12 text-rose-400" />
          <h1 className="text-xl font-bold font-serif text-foreground">Invitation Invalid</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button onClick={() => router.push("/workspaces")}>Go to Workspaces</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full flex flex-col items-center gap-4 text-center p-8 bg-white rounded-2xl border border-emerald-200 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Users className="w-7 h-7 text-accent" />
        </div>
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        <h1 className="text-xl font-bold font-serif text-foreground">Welcome to the team!</h1>
        <p className="text-sm text-muted-foreground">
          You've successfully joined <strong>{workspace?.name}</strong>. It's now your active workspace.
        </p>
        <Button onClick={() => router.push("/dashboard")} className="w-full gap-2">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
