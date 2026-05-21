import axios from "axios";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Pause, RotateCcw, UploadCloud, X, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getWorkspaces, notifyError, notifyInfo, uploadMedia } from "@/lib/api";
import { LoadingButton } from "@/components/ui/loading-button";
import { formatBytes } from "@/lib/format";

type QueueItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "processing" | "success" | "failed" | "canceled";
  speed?: string;
  preview?: string;
};

export function MediaUploader() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const queryClient = useQueryClient();
  const { data: workspaces = [], isLoading } = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });

  function enqueue(files?: FileList | null) {
    if (!files?.length) return;
    const existingKeys = new Set(queue.map((item) => `${item.file.name}:${item.file.size}:${item.file.lastModified}`));
    const items = Array.from(files)
      .filter((file) => !existingKeys.has(`${file.name}:${file.size}:${file.lastModified}`))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "queued" as const,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
      }));
    if (!items.length) {
      toast("Duplicate file already exists in the queue", { icon: "!" });
      return;
    }
    setQueue((current) => [...items, ...current]);
    notifyInfo(`${items.length} file${items.length > 1 ? "s" : ""} added to upload queue`);
  }

  async function startUpload(item: QueueItem) {
    if (activeId || item.status === "uploading" || item.status === "success") return;
    if (!workspaceId) {
      toast.error("Select a Telegram workspace first");
      return;
    }
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    setActiveId(item.id);
    setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "uploading", progress: 1 } : q));
    try {
      await uploadMedia(item.file, workspaceId, (progress) => {
        if (controller.signal.aborted) return;
        setQueue((current) => current.map((q) => q.id === item.id ? { ...q, progress, speed: `${progress}% uploaded` } : q));
      }, controller.signal);
      if (controller.signal.aborted) return;
      setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "success", progress: 100 } : q));
      toast.success("Media uploaded successfully");
      setTimeout(() => remove(item.id), 2500);
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } catch (error) {
      if (axios.isCancel(error) || controller.signal.aborted) {
        setQueue((current) => current.filter((q) => q.id !== item.id));
        toast("Upload canceled", { icon: "!" });
        return;
      }
      setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "failed" } : q));
      notifyError(error, "Upload failed. Please retry.");
    } finally {
      controllers.current.delete(item.id);
      setActiveId((current) => current === item.id ? null : current);
    }
  }

  function cancel(item: QueueItem) {
    controllers.current.get(item.id)?.abort();
    setQueue((current) => current.filter((q) => q.id !== item.id));
    setActiveId((current) => current === item.id ? null : current);
    toast("Upload canceled", { icon: "!" });
  }

  function remove(id: string) {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setQueue((current) => current.filter((q) => q.id !== id));
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-panel p-5">
      <select
        disabled={isLoading || activeId !== null}
        className="mb-4 h-10 w-full rounded-md border border-border bg-[#0a0d13] px-3 text-sm text-white disabled:opacity-60"
        value={workspaceId}
        onChange={(event) => setWorkspaceId(event.target.value)}
      >
        <option value="">{isLoading ? "Loading workspaces..." : "Select Telegram workspace"}</option>
        {workspaces.map((workspace) => (
          <option key={workspace._id} value={workspace._id}>
            {workspace.name} (@{workspace.telegramBotUsername})
          </option>
        ))}
      </select>

      <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-md bg-panel-2 text-center transition hover:bg-slate-800">
        <UploadCloud className="mb-3 text-accent" />
        <span className="text-sm font-medium text-white">Drop media or browse</span>
        <span className="mt-1 text-xs text-muted">Images, videos, PDFs and documents</span>
        <input className="sr-only" type="file" multiple onChange={(event) => enqueue(event.target.files)} />
      </label>

      <div className="mt-4 space-y-3">
        {queue.map((item) => (
          <div key={item.id} className="rounded-md border border-border bg-panel-2 p-3 transition">
            <div className="flex items-center gap-3">
              {item.preview ? <img src={item.preview} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded bg-[#090c13] text-xs text-muted">File</div>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.file.name}</p>
                <p className="text-xs text-muted">{item.status} - {formatBytes(item.file.size)} {item.speed ? `- ${item.speed}` : ""}</p>
              </div>
              {item.status === "success" && <CheckCircle2 className="text-emerald-300" size={18} />}
              {item.status === "failed" && <XCircle className="text-red-300" size={18} />}
              <button className="rounded p-1 text-muted hover:bg-white/5 hover:text-white" onClick={() => remove(item.id)} aria-label="Remove upload"><X size={16} /></button>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded bg-slate-800">
              <div className="h-full bg-accent transition-all" style={{ width: `${item.progress}%` }} />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <LoadingButton size="sm" variant="secondary" loading={activeId === item.id} loadingText="Uploading..." disabled={!!activeId || item.status === "success"} onClick={() => startUpload(item)}>
                {item.status === "failed" ? <><RotateCcw size={14} /> Retry</> : "Upload"}
              </LoadingButton>
              <LoadingButton size="sm" variant="ghost" disabled={item.status !== "uploading"} onClick={() => cancel(item)}><Pause size={14} /> Cancel</LoadingButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
