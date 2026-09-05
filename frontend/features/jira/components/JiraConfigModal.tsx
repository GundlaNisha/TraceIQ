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
import {
  useJiraConfig,
  useSaveJiraConfig,
  useDeleteJiraConfig,
  useTestJiraConnection,
  useRotateWebhookSecret,
  useTestJiraWebhook,
} from "../api/queries";
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
  Send,
  Terminal,
  Info,
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
  const { mutateAsync: testWebhook, isPending: isTestingWebhook } = useTestJiraWebhook();

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [webhookResult, setWebhookResult] = useState<{ webhook_url: string; webhook_secret: string } | null>(null);
  const [copiedField, setCopiedField] = useState<"url" | "secret" | null>(null);
  const [testWebhookResult, setTestWebhookResult] = useState<{
    success: boolean;
    message: string;
    issue_key?: string;
    old_status?: string | null;
    new_status?: string | null;
  } | null>(null);
  const [testWebhookError, setTestWebhookError] = useState<string | null>(null);
  const [showCurlCommand, setShowCurlCommand] = useState(false);

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

            {/* Webhook Configuration & Auto-Sync Panel */}
            {config?.is_configured && (
              <div className="mt-6 border-t border-border/40 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-violet-600" />
                    <h3 className="font-semibold text-sm text-foreground">Jira to TraceIQ Webhook Sync</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Auto-Sync
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  TraceIQ listens for Jira issue updates in real time to automatically sync requirement status and detect specification drift.
                </p>

                {/* Localhost & Jira Cloud Guidance */}
                <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 text-[11px] text-amber-900 space-y-1.5">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-950">
                    <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    Testing with Jira Cloud on Localhost?
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    Jira Cloud servers cannot deliver webhooks to private <code className="font-mono bg-amber-100/90 px-1 py-0.5 rounded text-amber-950 font-bold">localhost</code> addresses. For local testing, run <code className="font-mono bg-amber-100/90 px-1 py-0.5 rounded text-amber-950 font-bold">ngrok http 8000</code> and use your public HTTPS ngrok URL in Jira.
                  </p>
                </div>

                {webhookResult ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 space-y-3">
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
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      In Jira: <strong>Settings &rarr; System &rarr; WebHooks &rarr; Create a WebHook</strong>. Paste URL and secret, and select: <strong>Issue Updated</strong> and <strong>Issue Deleted</strong>.
                    </p>
                  </div>
                ) : null}

                {/* Actions & Verification Toolbar */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
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
                    className="text-xs gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
                  >
                    {isRotating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {isRotating ? "Generating..." : webhookResult ? "Regenerate Secret" : "Show / Generate Webhook Secret"}
                  </Button>

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={isTestingWebhook}
                    onClick={async () => {
                      setTestWebhookResult(null);
                      setTestWebhookError(null);
                      try {
                        const res = await testWebhook(workspaceId);
                        setTestWebhookResult(res);
                      } catch (err: any) {
                        setTestWebhookError(err.message || "Failed to test webhook simulation");
                      }
                    }}
                    className="text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                  >
                    {isTestingWebhook ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isTestingWebhook ? "Testing Delivery..." : "Send Test Ping"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCurlCommand(!showCurlCommand)}
                    className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    {showCurlCommand ? "Hide cURL" : "Test via cURL"}
                  </Button>
                </div>

                {/* Verification Feedback Banner */}
                {testWebhookResult && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      Webhook Verified &amp; Operational!
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      Simulated webhook event for issue <strong>{testWebhookResult.issue_key}</strong>: status transitioned from &apos;{testWebhookResult.old_status || "To Do"}&apos; to &apos;{testWebhookResult.new_status}&apos;. Check your Requirements dashboard to see the live update!
                    </p>
                  </div>
                )}

                {testWebhookError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-rose-900">Webhook Test Error</p>
                      <p className="text-[11px]">{testWebhookError}</p>
                    </div>
                  </div>
                )}

                {/* cURL Command Helper */}
                {showCurlCommand && (
                  <div className="rounded-xl bg-slate-900 text-slate-100 p-3.5 text-[11px] font-mono space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Terminal Test Command</span>
                      <button
                        type="button"
                        onClick={() => {
                          const secretVal = webhookResult?.webhook_secret || "YOUR_SECRET";
                          const cmd = `curl -X POST "http://localhost:8000/api/v1/jira/webhook?secret=${secretVal}" -H "Content-Type: application/json" -d '{"webhookEvent":"jira:issue_updated","issue":{"key":"SAM1-1","fields":{"status":{"name":"In Progress"}}}}'`;
                          navigator.clipboard.writeText(cmd);
                          setCopiedField("secret");
                          setTimeout(() => setCopiedField(null), 2000);
                        }}
                        className="hover:text-white flex items-center gap-1 text-[10px] text-slate-300"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedField === "secret" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="break-all whitespace-pre-wrap text-emerald-400 leading-relaxed bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                      curl -X POST &quot;http://localhost:8000/api/v1/jira/webhook?secret={webhookResult?.webhook_secret || "YOUR_SECRET"}&quot; \<br />
                      &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \<br />
                      &nbsp;&nbsp;-d &apos;&#123;&quot;webhookEvent&quot;:&quot;jira:issue_updated&quot;,&quot;issue&quot;:&#123;&quot;key&quot;:&quot;SAM1-1&quot;,&quot;fields&quot;:&#123;&quot;status&quot;:&#123;&quot;name&quot;:&quot;In Progress&quot;&#125;&#125;&#125;&#125;&apos;
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
