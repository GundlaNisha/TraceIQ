"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useJiraConfig, useSaveJiraConfig, useDeleteJiraConfig, useTestJiraConnection, useRotateWebhookSecret } from "../api/queries";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2,
  ShieldCheck,
  Zap,
  Webhook,
  Copy,
  RefreshCw,
} from "lucide-react";

const schema = z.object({
  jira_domain: z
    .string()
    .min(3, "Domain is required")
    .refine(
      (v) => v.includes("atlassian.net") || v.includes("http://") || v.includes("https://") || v.includes("."),
      "Enter a valid Jira domain (e.g. company.atlassian.net)"
    ),
  jira_email: z.string().email("Valid Jira email address is required"),
  jira_api_token: z.string().min(1, "API token is required"),
  default_project_key: z.string().max(64).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string | null;
  onSaved?: () => void;
}

export function JiraConfigModal({ open, onOpenChange, workspaceId, onSaved }: Props) {
  const { data: config, isLoading } = useJiraConfig(workspaceId);
  const { mutateAsync: saveConfig, isPending: isSaving } = useSaveJiraConfig();
  const { mutateAsync: deleteConfig, isPending: isDeleting } = useDeleteJiraConfig();
  const { mutateAsync: testConnection, isPending: isTesting } = useTestJiraConnection();
  const { mutateAsync: rotateSecret, isPending: isRotating } = useRotateWebhookSecret();

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [webhookResult, setWebhookResult] = useState<{ webhook_url: string; webhook_secret: string } | null>(null);
  const [copiedField, setCopiedField] = useState<"url" | "secret" | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      jira_domain: "",
      jira_email: "",
      jira_api_token: "",
      default_project_key: "",
    },
  });

  useEffect(() => {
    if (config?.is_configured) {
      reset({
        jira_domain: config.jira_domain || "",
        jira_email: config.jira_email || "",
        jira_api_token: "", // Don't expose token in form
        default_project_key: config.default_project_key || "",
      });
    } else {
      reset({
        jira_domain: "",
        jira_email: "",
        jira_api_token: "",
        default_project_key: "",
      });
    }
    setTestResult(null);
    setSaveError(null);
  }, [config, reset, open]);

  async function handleTest() {
    setTestResult(null);
    setSaveError(null);
    const values = getValues();
    if (!values.jira_domain || !values.jira_email || !values.jira_api_token) {
      setTestResult({
        success: false,
        message: "Please enter domain, email, and API token to test.",
      });
      return;
    }
    try {
      const res = await testConnection({
        jira_domain: values.jira_domain,
        jira_email: values.jira_email,
        jira_api_token: values.jira_api_token,
        workspace_id: workspaceId,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Failed to connect to Jira instance",
      });
    }
  }

  async function onSubmit(data: FormData) {
    setSaveError(null);
    try {
      await saveConfig({
        jira_domain: data.jira_domain,
        jira_email: data.jira_email,
        jira_api_token: data.jira_api_token,
        default_project_key: data.default_project_key || null,
        workspace_id: workspaceId,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save Jira configuration");
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to disconnect Jira?")) return;
    try {
      await deleteConfig(workspaceId);
      onOpenChange(false);
    } catch (err: any) {
      setSaveError(err.message || "Failed to delete Jira configuration");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl font-serif">Connect Atlassian Jira</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted">
            Configure Jira REST API credentials to browse, import, and sync requirements directly into TraceIQ.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading connection settings...
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
              {config?.is_configured && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold">Connected to {config.jira_domain}</div>
                      <div className="text-[11px] text-emerald-700">Account: {config.jira_email} ({config.token_preview})</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-100/60 p-1.5 rounded-lg transition-colors inline-flex items-center gap-1 font-medium"
                    title="Disconnect Jira"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jira_domain" className="text-xs font-semibold">Jira Domain / URL</Label>
                <Input
                  id="jira_domain"
                  placeholder="https://yourcompany.atlassian.net"
                  className="text-xs"
                  {...register("jira_domain")}
                />
                {errors.jira_domain && (
                  <p className="text-xs text-rose-500">{errors.jira_domain.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jira_email" className="text-xs font-semibold">Atlassian Account Email</Label>
                <Input
                  id="jira_email"
                  type="email"
                  placeholder="engineer@company.com"
                  className="text-xs"
                  {...register("jira_email")}
                />
                {errors.jira_email && (
                  <p className="text-xs text-rose-500">{errors.jira_email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="jira_api_token" className="text-xs font-semibold">Atlassian API Token</Label>
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Create API Token <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Input
                  id="jira_api_token"
                  type="password"
                  placeholder={config?.is_configured ? "Enter new token to replace existing" : "Paste your Atlassian API token"}
                  className="text-xs font-mono"
                  {...register("jira_api_token")}
                />
                {errors.jira_api_token && (
                  <p className="text-xs text-rose-500">{errors.jira_api_token.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="default_project_key" className="text-xs font-semibold">
                  Default Project Key <span className="text-muted font-normal">(Optional)</span>
                </Label>
                <Input
                  id="default_project_key"
                  placeholder="e.g. PROJ, CORE, AUTH"
                  className="text-xs uppercase font-mono"
                  {...register("default_project_key")}
                />
                {errors.default_project_key && (
                  <p className="text-xs text-rose-500">{errors.default_project_key.message}</p>
                )}
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{testResult.success ? "Connection Verified" : "Verification Failed"}</div>
                    <div className="text-[11px] opacity-90">{testResult.message}</div>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={isTesting || isSaving}
                  className="text-xs font-semibold"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving || isTesting}
                    className="text-xs font-semibold bg-accent text-white hover:bg-accent/90"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      "Save Connection"
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* Phase 2: Webhook Configuration Panel */}
            {config?.is_configured && (
              <div className="mt-6 border-t border-border/40 pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-violet-600" />
                  <h3 className="font-semibold text-sm text-foreground">Jira to TraceIQ Webhooks</h3>
                  <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Phase 2
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Register a Jira webhook to automatically sync requirement status and detect drift
                  when issues are updated in Jira.
                </p>

                {webhookResult ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
                    <p className="text-xs font-semibold text-violet-800 uppercase tracking-wider">
                      Copy these into Jira Webhook settings:
                    </p>

                    <div className="space-y-1">
                      <p className="text-[11px] text-muted font-medium">Webhook URL</p>
                      <div className="flex gap-2">
                        <code className="flex-1 text-xs font-mono bg-white border border-violet-200 px-3 py-1.5 rounded-lg text-violet-900 truncate">
                          {webhookResult.webhook_url}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(webhookResult.webhook_url);
                            setCopiedField("url");
                            setTimeout(() => setCopiedField(null), 2000);
                          }}
                          className="p-1.5 hover:bg-violet-100 rounded-lg transition-colors text-violet-700"
                          title="Copy URL"
                        >
                          {copiedField === "url" ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-muted font-medium">
                        Shared Secret{" "}
                        <span className="text-rose-500 font-bold">(shown once - copy now!)</span>
                      </p>
                      <div className="flex gap-2">
                        <code className="flex-1 text-xs font-mono bg-white border border-rose-200 px-3 py-1.5 rounded-lg text-rose-800 truncate">
                          {webhookResult.webhook_secret}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(webhookResult.webhook_secret);
                            setCopiedField("secret");
                            setTimeout(() => setCopiedField(null), 2000);
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors text-rose-600"
                          title="Copy secret"
                        >
                          {copiedField === "secret" ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      In Jira: Settings - System - WebHooks - Create WebHook. Paste the URL and
                      secret above. Select events: <strong>Issue Updated</strong>,{" "}
                      <strong>Issue Deleted</strong>.
                    </p>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRotating}
                    onClick={async () => {
                      try {
                        const res = await rotateSecret(workspaceId);
                        setWebhookResult({
                          webhook_url: res.webhook_url,
                          webhook_secret: res.webhook_secret,
                        });
                      } catch (err: any) {
                        setSaveError(err.message || "Failed to generate webhook secret");
                      }
                    }}
                    className="text-xs gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
                  >
                    {isRotating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {isRotating ? "Generating..." : "Generate Webhook Secret"}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
