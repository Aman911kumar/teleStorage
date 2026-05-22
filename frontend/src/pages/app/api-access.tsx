import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Copy,
  FileJson,
  KeyRound,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/empty-state";
import { PageLoading } from "@/components/page-loading";
import {
  createApiKey,
  deleteApiKeyPermanently,
  getApiKeys,
  getApiRequestLogs,
  getWorkspaces,
  notifyError,
  regenerateApiKey,
  revokeApiKey,
  type ApiKey,
  type Workspace
} from "@/lib/api";

const scopes = ["upload", "read", "write", "delete", "full"];
const emptyWorkspaces: Workspace[] = [];

function copy(value: string, label = "Copied") {
  navigator.clipboard.writeText(value);
  toast.success(label);
}

function mask(value?: string) {
  if (!value) return "Create a key to generate credentials";
  return value.length > 16 ? `${value.slice(0, 12)}...${value.slice(-6)}` : value;
}

function buildExamples(key?: ApiKey, secret?: string) {
  const apiKey = key?.publicKey ?? "your_api_key_here";
  const apiSecret = secret ?? "example_secret";
  return {
    curl: `curl -X POST https://your-domain.com/api/v1/upload \\
  -H "x-api-key: ${apiKey}" \\
  -H "x-api-secret: ${apiSecret}" \\
  -F "file=@avatar.png" \\
  -F "visibility=public" \\
  -F 'tags=["avatar","profile"]'`,
    js: `const form = new FormData();
form.append("file", file);
form.append("folderId", "optional_folder_id");
form.append("metadata", JSON.stringify({ source: "web" }));

const response = await fetch("https://your-domain.com/api/v1/upload", {
  method: "POST",
  headers: {
    "x-api-key": "${apiKey}",
    "x-api-secret": "${apiSecret}"
  },
  body: form
});

const result = await response.json();`,
    folders: `await fetch("https://your-domain.com/api/v1/folders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}",
    "x-api-secret": "${apiSecret}"
  },
  body: JSON.stringify({ name: "product-images" })
});`
  };
}

function Snippet({ title, value }: { title: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <Button variant="secondary" size="sm" onClick={() => copy(value)}>
          <Copy size={14} /> Copy
        </Button>
      </div>
      <pre className="overflow-auto rounded-md bg-[#090c13] p-4 text-sm leading-6 text-slate-300">
        <code>{value}</code>
      </pre>
    </Card>
  );
}

function KeyCard({
  apiKey,
  secret,
  onRegenerate,
  onRevoke,
  onDeletePermanently,
  isRegenerating,
  isRevoking,
  isDeletingPermanently
}: {
  apiKey: ApiKey;
  secret?: string;
  onRegenerate: () => void;
  onRevoke: () => void;
  onDeletePermanently: () => void;
  isRegenerating: boolean;
  isRevoking: boolean;
  isDeletingPermanently: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound size={17} className="text-accent" />
            <h2 className="font-semibold text-white">{apiKey.name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${apiKey.status === "active" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
              {apiKey.status}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">Last used {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString() : "never"}</p>
        </div>
        <div className="flex gap-2">
          {apiKey.status === "active" ? (
            <>
              <LoadingButton variant="secondary" size="sm" loading={isRegenerating} loadingText="Regenerating" onClick={onRegenerate}>
                <RefreshCw size={14} /> Regenerate
              </LoadingButton>
              <LoadingButton variant="secondary" size="sm" loading={isRevoking} loadingText="Revoking" onClick={onRevoke}>
                <Trash2 size={14} className="text-red-300" /> Revoke
              </LoadingButton>
            </>
          ) : (
            <LoadingButton variant="destructive" size="sm" loading={isDeletingPermanently} loadingText="Deleting" onClick={onDeletePermanently}>
              <Trash2 size={14} /> Delete permanently
            </LoadingButton>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-[#090c13] p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>Public API key</span>
            <button className="text-accent" onClick={() => copy(apiKey.publicKey, "Public key copied")}>Copy</button>
          </div>
          <code className="break-all text-xs text-slate-300">{apiKey.publicKeyMasked ?? mask(apiKey.publicKey)}</code>
        </div>
        <div className="rounded-md border border-border bg-[#090c13] p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>Secret key</span>
            {secret && <button className="text-accent" onClick={() => copy(secret, "Secret key copied")}>Copy</button>}
          </div>
          <code className="break-all text-xs text-slate-300">{secret ?? "Hidden after creation. Regenerate to reveal a new one."}</code>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {apiKey.scopes.map((scope) => (
          <span key={scope} className="rounded-md border border-border bg-white/3 px-2 py-1 text-xs text-slate-300">{scope}</span>
        ))}
      </div>
    </Card>
  );
}

export default function ApiAccess() {
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState("");
  const [name, setName] = useState("Production key");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["full"]);
  const [freshSecrets, setFreshSecrets] = useState<Record<string, string>>({});

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });
  const workspaces = workspacesQuery.data ?? emptyWorkspaces;
  const selectedWorkspace = useMemo<Workspace | undefined>(() => workspaces.find((workspace) => workspace._id === workspaceId) ?? workspaces[0], [workspaces, workspaceId]);
  const activeWorkspaceId = selectedWorkspace?._id;

  const keysQuery = useQuery({
    queryKey: ["api-keys", activeWorkspaceId],
    queryFn: () => getApiKeys(activeWorkspaceId),
    enabled: Boolean(activeWorkspaceId)
  });
  const logsQuery = useQuery({
    queryKey: ["api-request-logs", activeWorkspaceId],
    queryFn: () => getApiRequestLogs(activeWorkspaceId),
    enabled: Boolean(activeWorkspaceId)
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: async (apiKey) => {
      setFreshSecrets((current) => ({ ...current, [apiKey._id]: apiKey.secret }));
      toast.success("API key created. Copy the secret now.");
      await queryClient.invalidateQueries({ queryKey: ["api-keys", activeWorkspaceId] });
    },
    onError: (error) => notifyError(error, "Unable to create API key.")
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateApiKey,
    onSuccess: async (apiKey) => {
      setFreshSecrets((current) => ({ ...current, [apiKey._id]: apiKey.secret }));
      toast.success("Secret regenerated. Copy it now.");
      await queryClient.invalidateQueries({ queryKey: ["api-keys", activeWorkspaceId] });
    },
    onError: (error) => notifyError(error, "Unable to regenerate secret.")
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: async () => {
      toast.success("API key revoked.");
      await queryClient.invalidateQueries({ queryKey: ["api-keys", activeWorkspaceId] });
    },
    onError: (error) => notifyError(error, "Unable to revoke API key.")
  });

  const deletePermanentlyMutation = useMutation({
    mutationFn: deleteApiKeyPermanently,
    onSuccess: async () => {
      toast.success("API key deleted permanently.");
      await queryClient.invalidateQueries({ queryKey: ["api-keys", activeWorkspaceId] });
    },
    onError: (error) => notifyError(error, "Unable to delete API key.")
  });

  const primaryKey = keysQuery.data?.find((apiKey) => apiKey.status === "active") ?? keysQuery.data?.[0];
  const examples = buildExamples(primaryKey, primaryKey ? freshSecrets[primaryKey._id] : undefined);

  function toggleScope(scope: string) {
    setSelectedScopes((current) => {
      if (scope === "full") return ["full"];
      const withoutFull = current.filter((item) => item !== "full");
      return withoutFull.includes(scope) ? withoutFull.filter((item) => item !== scope) : [...withoutFull, scope];
    });
  }

  if (workspacesQuery.isLoading) return <PageShell eyebrow="API Access" title="Developer access"><PageLoading cards={4} /></PageShell>;
  if (workspacesQuery.isError) return <PageShell eyebrow="API Access" title="Developer access"><EmptyState icon={KeyRound} title="Unable to load API access" text="Workspace credentials could not be loaded." action="Retry" onAction={() => workspacesQuery.refetch()} /></PageShell>;

  return (
    <PageShell eyebrow="API Access" title="Developer storage API" description="Create scoped keys, test requests, inspect usage, and connect external apps to your Telegram-backed storage workspace.">
      {!workspaces.length ? (
        <EmptyState icon={KeyRound} title="No workspace connected" text="Connect a Telegram workspace before creating developer API credentials." action="Open Workspaces" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-accent"><ShieldCheck size={16} /> Workspace</div>
              <select
                className="mt-4 h-10 w-full rounded-md border border-border bg-[#0a0d13] px-3 text-sm text-white"
                value={activeWorkspaceId ?? ""}
                onChange={(event) => setWorkspaceId(event.target.value)}
              >
                {workspaces.map((workspace) => <option key={workspace._id} value={workspace._id}>{workspace.name}</option>)}
              </select>
              <div className="mt-4 rounded-md border border-border bg-[#090c13] p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted">
                  <span>Public project ID</span>
                  <button className="text-accent" onClick={() => copy(selectedWorkspace?.publicProjectId ?? "", "Project ID copied")}>Copy</button>
                </div>
                <code className="break-all text-xs text-slate-300">{selectedWorkspace?.publicProjectId}</code>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-accent"><Plus size={16} /> Create API key</div>
              <input
                className="mt-4 h-10 w-full rounded-md border border-border bg-[#0a0d13] px-3 text-sm text-white outline-none focus:border-accent"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Key name"
              />
              <div className="mt-4 grid grid-cols-2 gap-2">
                {scopes.map((scope) => (
                  <button
                    key={scope}
                    className={`rounded-md border px-3 py-2 text-left text-xs transition ${selectedScopes.includes(scope) ? "border-accent bg-accent/10 text-white" : "border-border bg-white/3 text-muted hover:text-white"}`}
                    onClick={() => toggleScope(scope)}
                    type="button"
                  >
                    {scope}
                  </button>
                ))}
              </div>
              <LoadingButton
                className="mt-4 w-full"
                loading={createMutation.isPending}
                loadingText="Creating key..."
                onClick={() => activeWorkspaceId && createMutation.mutate({ workspaceId: activeWorkspaceId, name, scopes: selectedScopes.length ? selectedScopes : ["read"] })}
                disabled={!activeWorkspaceId || !name.trim()}
              >
                <LockKeyhole size={15} /> Create key
              </LoadingButton>
              <p className="mt-3 text-xs leading-5 text-muted">Secrets are shown once. Store them in your app environment variables and regenerate if they are lost.</p>
            </Card>

            <Card className="p-5">
              <CheckCircle2 className="text-emerald-300" />
              <h2 className="mt-4 font-semibold text-white">Auth headers</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Use <code>x-api-key</code> and <code>x-api-secret</code>, or send <code>Authorization: Bearer pk:sk</code>.</p>
            </Card>
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["Upload", "POST /api/v1/upload", Terminal],
                ["Files", "GET /api/v1/files", FileJson],
                ["Search", "GET /api/v1/search", Activity],
                ["Media", "PATCH /api/v1/media/:id", KeyRound]
              ].map(([title, path, Icon]) => (
                <Card key={title as string} className="p-5">
                  <Icon className="text-accent" />
                  <h2 className="mt-4 font-semibold text-white">{title as string}</h2>
                  <code className="mt-2 block text-xs text-muted">{path as string}</code>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              {keysQuery.isLoading ? <PageLoading cards={2} /> : keysQuery.data?.length ? (
                keysQuery.data.map((apiKey) => (
                  <KeyCard
                    key={apiKey._id}
                    apiKey={apiKey}
                    secret={freshSecrets[apiKey._id]}
                    onRegenerate={() => regenerateMutation.mutate(apiKey._id)}
                    onRevoke={() => revokeMutation.mutate(apiKey._id)}
                    onDeletePermanently={() => {
                      if (window.confirm("Delete this revoked API key permanently? This cannot be undone.")) {
                        deletePermanentlyMutation.mutate(apiKey._id);
                      }
                    }}
                    isRegenerating={regenerateMutation.isPending}
                    isRevoking={revokeMutation.isPending}
                    isDeletingPermanently={deletePermanentlyMutation.isPending}
                  />
                ))
              ) : (
                <EmptyState icon={KeyRound} title="No API keys yet" text="Create your first key to upload files from external apps." />
              )}
            </div>

            <Snippet title="Upload with curl" value={examples.curl} />
            <Snippet title="Upload with JavaScript" value={examples.js} />
            <Snippet title="Create a folder" value={examples.folders} />

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">Recent API requests</h2>
                  <p className="mt-1 text-sm text-muted">Latest v1 calls for this workspace.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => logsQuery.refetch()}><RefreshCw size={14} /> Refresh</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-155 text-left text-sm">
                  <thead className="text-xs uppercase text-muted">
                    <tr>
                      <th className="py-2">Method</th>
                      <th className="py-2">Path</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Duration</th>
                      <th className="py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(logsQuery.data ?? []).slice(0, 8).map((log) => (
                      <tr key={log._id} className="text-slate-300">
                        <td className="py-3 font-mono text-xs">{log.method}</td>
                        <td className="py-3 font-mono text-xs">{log.path}</td>
                        <td className={`py-3 text-xs ${log.statusCode >= 400 ? "text-red-300" : "text-emerald-300"}`}>{log.statusCode}</td>
                        <td className="py-3 text-xs">{log.durationMs}ms</td>
                        <td className="py-3 text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!logsQuery.data?.length && <p className="py-6 text-center text-sm text-muted">No API requests recorded yet.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}
