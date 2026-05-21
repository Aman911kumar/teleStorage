import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Database, Loader2, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageLoading } from "@/components/page-loading";
import { createWorkspace, deleteWorkspace, getWorkspaces, notifyError, updateWorkspace, validateWorkspace, type Workspace } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

type FormState = { name: string; telegramBotToken: string; telegramChannelId: string };

export default function Workspaces() {
  const [form, setForm] = useState<FormState>({ name: "", telegramBotToken: "", telegramChannelId: "" });
  const [validated, setValidated] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data = [], isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });

  function validateLocal(requireName = false) {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (requireName && form.name.trim().length < 2) next.name = "Workspace name must be at least 2 characters.";
    if (!form.telegramBotToken.includes(":") || form.telegramBotToken.length < 20) next.telegramBotToken = "Enter a valid Telegram bot token.";
    if (form.telegramChannelId.trim().length < 3) next.telegramChannelId = "Enter your Telegram channel ID.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  const validateMutation = useMutation({
    mutationFn: validateWorkspace,
    onMutate: () => {
      setFailed(false);
      setValidated(null);
    },
    onSuccess: (data) => {
      setValidated(`Connected @${data.botUsername} to ${data.channelTitle ?? data.channelId}`);
      toast.success("Telegram connection verified");
    },
    onError: (error) => {
      setFailed(true);
      setFieldErrors({ telegramBotToken: "Check the bot token.", telegramChannelId: "Check channel access and admin permissions." });
      notifyError(error, "Unable to connect Telegram bot. Please verify bot token and channel permissions.");
    }
  });

  const createMutation = useMutation({
    mutationFn: createWorkspace,
    onMutate: () => {
      setFailed(false);
    },
    onSuccess: async () => {
      setForm({ name: "", telegramBotToken: "", telegramChannelId: "" });
      setValidated(null);
      toast.success("Workspace connected successfully");
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      setTimeout(() => navigate("/app/media"), 550);
    },
    onError: (error) => {
      setFailed(true);
      notifyError(error, "Unable to connect workspace. Please check Telegram permissions.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FormState> }) => updateWorkspace(id, input),
    onSuccess: async () => {
      toast.success("Workspace updated successfully");
      setEditing(null);
      setForm({ name: "", telegramBotToken: "", telegramChannelId: "" });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => notifyError(error, "Unable to update workspace. Please verify Telegram details.")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["workspaces"] });
      const previous = queryClient.getQueryData(["workspaces"]);
      queryClient.setQueryData(["workspaces"], data.filter((workspace) => workspace._id !== id));
      return { previous };
    },
    onSuccess: async () => {
      toast.success("Workspace deleted successfully");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["workspaces"], context.previous);
      notifyError(error, "Unable to delete workspace. Please try again.");
    }
  });

  const busy = validateMutation.isPending || createMutation.isPending || updateMutation.isPending;

  function onValidate() {
    if (validateLocal(false)) validateMutation.mutate(form);
    else setFailed(true);
  }

  function onCreate() {
    if (validateLocal(true)) createMutation.mutate(form);
    else setFailed(true);
  }

  function startEdit(workspace: Workspace) {
    setEditing(workspace);
    setForm({ name: workspace.name, telegramBotToken: "", telegramChannelId: workspace.telegramChannelId });
    setValidated(null);
    setFieldErrors({});
  }

  function onUpdate() {
    if (!editing) return;
    const input: Partial<FormState> = { name: form.name };
    if (form.telegramBotToken) input.telegramBotToken = form.telegramBotToken;
    if (form.telegramChannelId) input.telegramChannelId = form.telegramChannelId;
    updateMutation.mutate({ id: editing._id, input });
  }

  function fieldClass(name: keyof FormState) {
    return fieldErrors[name] ? "border-red-400/70 focus:border-red-400" : "";
  }

  return (
    <PageShell eyebrow="Workspaces" title="Connect Telegram storage" description="Create a workspace by connecting your own Telegram bot and channel. Tokens are encrypted before storage and masked in the UI.">
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card className={cn("relative p-5", failed && "animate-shake border-red-500/50")}>
          {(validateMutation.isPending || createMutation.isPending) && (
            <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-background/55 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-md border border-border bg-panel px-4 py-2 text-sm text-white">
                <Loader2 className="animate-spin text-accent" size={16} />
                {updateMutation.isPending ? "Updating workspace..." : createMutation.isPending ? "Connecting workspace..." : "Validating Telegram..."}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-accent"><Send size={16} /> Onboarding</div>
          <div className="mt-5 space-y-3">
            <div>
              <Input disabled={createMutation.isPending} className={fieldClass("name")} placeholder="Workspace name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              {fieldErrors.name && <p className="mt-1 text-xs text-red-300">{fieldErrors.name}</p>}
            </div>
            <div>
              <Input disabled={busy} className={fieldClass("telegramBotToken")} placeholder="Telegram bot token" type="password" value={form.telegramBotToken} onChange={(event) => setForm({ ...form, telegramBotToken: event.target.value })} />
              {fieldErrors.telegramBotToken && <p className="mt-1 text-xs text-red-300">{fieldErrors.telegramBotToken}</p>}
            </div>
            <div>
              <Input disabled={busy} className={fieldClass("telegramChannelId")} placeholder="Telegram channel ID, e.g. -1001234567890" value={form.telegramChannelId} onChange={(event) => setForm({ ...form, telegramChannelId: event.target.value })} />
              {fieldErrors.telegramChannelId && <p className="mt-1 text-xs text-red-300">{fieldErrors.telegramChannelId}</p>}
            </div>
            {validated && <p className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"><CheckCircle2 size={16} /> {validated}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              <LoadingButton variant="secondary" loading={validateMutation.isPending} loadingText="Validating Telegram..." disabled={!form.telegramBotToken || !form.telegramChannelId || createMutation.isPending} onClick={onValidate}>Validate</LoadingButton>
              {editing ? (
                <LoadingButton loading={updateMutation.isPending} loadingText="Updating..." disabled={!form.name || validateMutation.isPending} onClick={onUpdate}>Update Workspace</LoadingButton>
              ) : (
                <LoadingButton loading={createMutation.isPending} loadingText="Connecting..." disabled={!form.name || !form.telegramBotToken || !form.telegramChannelId || validateMutation.isPending} onClick={onCreate}>Connect Workspace</LoadingButton>
              )}
            </div>
            {editing && <button className="text-xs text-muted hover:text-white" onClick={() => { setEditing(null); setForm({ name: "", telegramBotToken: "", telegramChannelId: "" }); }}>Cancel editing</button>}
          </div>
        </Card>

        <div className="grid gap-4">
          {isLoading ? <PageLoading cards={2} /> : isError ? (
            <EmptyState icon={Database} title="Unable to load workspaces" text="The backend did not respond. Check your connection and retry." action="Retry" onAction={() => refetch()} />
          ) : data.length ? data.map((workspace) => (
            <Card key={workspace._id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300"><ShieldCheck size={13} /> {workspace.health?.status ?? "healthy"}</div>
                  <h2 className="font-semibold text-white">{workspace.name}</h2>
                  <p className="mt-1 text-sm text-muted">@{workspace.telegramBotUsername} - {workspace.telegramChannelTitle ?? workspace.telegramChannelId}</p>
                  <code className="mt-3 block rounded bg-[#090c13] p-2 text-xs text-muted">{workspace.telegramBotTokenMasked}</code>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted">Storage</p><p className="text-white">{formatBytes(workspace.storageUsed)}</p></div>
                  <div><p className="text-muted">Uploads</p><p className="text-white">{workspace.uploadCount}</p></div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <LoadingButton size="sm" variant="secondary" disabled={deleteMutation.isPending} onClick={() => startEdit(workspace)}>Edit</LoadingButton>
                <LoadingButton size="sm" variant="secondary" disabled={deleteMutation.isPending} onClick={() => setDeleteTarget(workspace)}>Delete</LoadingButton>
              </div>
            </Card>
          )) : <EmptyState icon={Database} title="No Telegram workspace connected" text="Connect your Telegram bot to begin storing media inside your own channel." action="Connect workspace" />}
          {isFetching && !isLoading && <p className="text-xs text-muted">Refreshing workspace status...</p>}
        </div>
      </div>

      <Card className="mt-5 p-5">
        <h2 className="font-semibold text-white">Telegram setup guide</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {["Create a bot with BotFather", "Create a private channel", "Add the bot as admin", "Paste bot token and channel ID"].map((step, index) => (
            <div key={step} className="rounded-md border border-border bg-panel-2 p-4">
              <p className="text-xs text-accent">Step {index + 1}</p>
              <p className="mt-2 text-sm text-white">{step}</p>
              <div className="mt-4 grid h-24 place-items-center rounded bg-[#090c13] text-xs text-muted">Screenshot placeholder</div>
            </div>
          ))}
        </div>
      </Card>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="max-w-md p-5">
            <h2 className="font-semibold text-white">Delete workspace?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">This disables the workspace in TeleStore. Existing Telegram messages are not removed.</p>
            <div className="mt-5 flex justify-end gap-2">
              <LoadingButton variant="ghost" disabled={deleteMutation.isPending} onClick={() => setDeleteTarget(null)}>Cancel</LoadingButton>
              <LoadingButton loading={deleteMutation.isPending} loadingText="Deleting..." onClick={() => deleteMutation.mutate(deleteTarget._id)}>Delete workspace</LoadingButton>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
