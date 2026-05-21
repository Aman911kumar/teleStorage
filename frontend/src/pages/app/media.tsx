import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronLeft,
  Copy,
  Download,
  Eye,
  File,
  FileArchive,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  Grid2X2,
  Image,
  Info,
  LayoutList,
  MoreHorizontal,
  Pause,
  RefreshCw,
  Search,
  Star,
  Trash2,
  UploadCloud,
  X,
  XCircle,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { PageLoading } from "@/components/page-loading";
import {
  createFolder,
  deleteFolder,
  deleteMedia,
  getFolders,
  getMedia,
  getWorkspaces,
  notifyError,
  renameFolder,
  updateMedia,
  uploadMedia,
  type FolderItem,
  type MediaItem,
  type Workspace
} from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type UploadItem = { id: string; file: File; progress: number; status: "queued" | "uploading" | "success" | "failed"; preview?: string };
type ExplorerFilter = "all" | "images" | "videos" | "documents" | "recent" | "favorites" | "trash" | "shared";

const filterItems: Array<{ id: ExplorerFilter; label: string; icon: typeof File }> = [
  { id: "all", label: "All Files", icon: File },
  { id: "images", label: "Images", icon: Image },
  { id: "videos", label: "Videos", icon: FileVideo },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "recent", label: "Recent", icon: RefreshCw },
  { id: "shared", label: "Shared", icon: Copy },
  { id: "trash", label: "Trash", icon: Trash2 }
];

function MediaTypeIcon({ item, size = 18, className = "text-accent" }: { item: MediaItem; size?: number; className?: string }) {
  if (item.mimeType.startsWith("image/")) return <Image className={className} size={size} />;
  if (item.mimeType.startsWith("video/")) return <FileVideo className={className} size={size} />;
  if (item.mimeType.includes("zip")) return <FileArchive className={className} size={size} />;
  if (item.mimeType.includes("pdf") || item.mimeType.includes("document") || item.mimeType.includes("text")) return <FileText className={className} size={size} />;
  return <File className={className} size={size} />;
}

function MediaImage({ id, alt, className = "h-full w-full" }: { id: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = `/media/${id}/view`;
  if (failed) {
    return (
      <div className={cn("grid place-items-center bg-[#090c13] text-muted", className)}>
        <div className="text-center">
          <Image className="mx-auto text-accent" size={30} />
          <p className="mt-2 text-xs">Preview unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-[#090c13]", className)}>
      {!loaded && <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,rgba(255,255,255,0.03),rgba(255,255,255,0.09),rgba(255,255,255,0.03))] bg-[length:200%_100%]" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn("h-full w-full object-cover transition duration-500", loaded ? "scale-100 opacity-100 blur-0" : "scale-[1.02] opacity-0 blur-sm")}
      />
    </div>
  );
}

function resolveMediaUrl(item: MediaItem, kind: "view" | "thumb" | "download" = "view") {
  const relative = kind === "thumb" ? item.thumbUrl : kind === "download" ? item.downloadUrl : item.viewUrl;
  if (relative) return relative.startsWith("http") ? relative : `${location.origin}${relative}`;
  return `${location.origin}/media/${item._id}/${kind === "thumb" ? "thumb" : kind}`;
}

function uploadKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export default function Media() {
  const queryClient = useQueryClient();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const [workspaceId, setWorkspaceId] = useState("");
  const [activeFolder, setActiveFolder] = useState<FolderItem | null>(null);
  const [filter, setFilter] = useState<ExplorerFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<MediaItem | null>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameFolderTarget, setRenameFolderTarget] = useState<FolderItem | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderItem | null>(null);
  const [queue, setQueue] = useState<UploadItem[]>([]);

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });
  const activeWorkspace: Workspace | undefined = useMemo(() => workspaces.find((workspace) => workspace._id === workspaceId) ?? workspaces[0], [workspaceId, workspaces]);
  const resolvedWorkspaceId = activeWorkspace?._id ?? "";

  const mediaQuery = useQuery({ queryKey: ["media"], queryFn: getMedia });
  const foldersQuery = useQuery({
    queryKey: ["folders", resolvedWorkspaceId],
    queryFn: () => getFolders(resolvedWorkspaceId),
    enabled: !!resolvedWorkspaceId
  });

  const createFolderMutation = useMutation({
    mutationFn: createFolder,
    onSuccess: async () => {
      toast.success("Folder created");
      setFolderName("");
      setNewFolderOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["folders", resolvedWorkspaceId] });
    },
    onError: (error) => notifyError(error, "Unable to create folder.")
  });

  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameFolder(id, { workspaceId: resolvedWorkspaceId, name }),
    onSuccess: async (folder) => {
      toast.success("Folder renamed");
      setRenameFolderTarget(null);
      setRenameFolderName("");
      setActiveFolder((current) => current?._id === folder._id ? folder : current);
      await queryClient.invalidateQueries({ queryKey: ["folders", resolvedWorkspaceId] });
    },
    onError: (error) => notifyError(error, "Unable to rename folder.")
  });

  const deleteFolderMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteFolder(id, resolvedWorkspaceId),
    onSuccess: async (_result, variables) => {
      toast.success("Folder deleted");
      if (activeFolder?._id === variables.id) setActiveFolder(null);
      setDeleteFolderTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["folders", resolvedWorkspaceId] });
    },
    onError: (error) => notifyError(error, "Folder must be empty before it can be deleted.")
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) => updateMedia(id, { folderId }),
    onSuccess: async () => {
      toast.success("File moved");
      await queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (error) => notifyError(error, "Unable to move file.")
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMedia,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["media"] });
      const previous = queryClient.getQueryData<MediaItem[]>(["media"]);
      queryClient.setQueryData<MediaItem[]>(["media"], (current = []) => current.filter((item) => item._id !== id));
      return { previous };
    },
    onSuccess: async () => {
      toast.success("Media deleted successfully");
      setDeleteTarget(null);
      setDetails(null);
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["media"], context.previous);
      notifyError(error, "Unable to delete media. Please try again.");
    }
  });

  const allFolders = foldersQuery.data ?? [];
  const media = useMemo(() => mediaQuery.data ?? [], [mediaQuery.data]);
  const currentFolderId = activeFolder?._id;
  const currentFiles = useMemo(() => {
    return media
      .filter((item) => (currentFolderId ? item.folderId === currentFolderId : !item.folderId))
      .filter((item) => {
        if (filter === "images") return item.mimeType.startsWith("image/");
        if (filter === "videos") return item.mimeType.startsWith("video/");
        if (filter === "documents") return !item.mimeType.startsWith("image/") && !item.mimeType.startsWith("video/");
        if (filter === "trash") return false;
        return true;
      })
      .filter((item) => item.originalName.toLowerCase().includes(query.toLowerCase()) || item.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase())));
  }, [media, currentFolderId, filter, query]);

  const currentFolders = allFolders.filter((folder) => (currentFolderId ? folder.parentId === currentFolderId : !folder.parentId));
  const selectedItems = currentFiles.filter((item) => selected.includes(item._id));
  const currentImageIndex = preview ? currentFiles.findIndex((item) => item._id === preview._id) : -1;

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function enqueue(files?: FileList | null) {
    if (!files?.length) return;
    const existing = new Set(queue.map((item) => uploadKey(item.file)));
    const incoming = Array.from(files)
      .filter((file) => !existing.has(uploadKey(file)))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "queued" as const,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
      }));
    if (!incoming.length) {
      toast("Files are already in the upload queue", { icon: "!" });
      return;
    }
    setQueue((current) => [...incoming, ...current]);
    setUploadOpen(true);
  }

  async function startUpload(item: UploadItem) {
    if (!resolvedWorkspaceId) {
      toast.error("Create or select a workspace first");
      return;
    }
    if (controllers.current.has(item.id)) return;
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "uploading", progress: 1 } : q));
    try {
      const result = await uploadMedia(item.file, resolvedWorkspaceId, (progress) => {
        if (!controller.signal.aborted) setQueue((current) => current.map((q) => q.id === item.id ? { ...q, progress } : q));
      }, controller.signal, { folderId: activeFolder?._id });
      if (controller.signal.aborted) return;
      setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "success", progress: 100 } : q));
      toast.success(result.duplicate ? "This file already exists in your workspace." : "Upload complete");
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setTimeout(() => removeUpload(item.id), 1800);
    } catch (error) {
      if (axios.isCancel(error) || controller.signal.aborted) return;
      setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "failed" } : q));
      notifyError(error, "Upload failed. Please retry.");
    } finally {
      controllers.current.delete(item.id);
    }
  }

  function removeUpload(id: string) {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setQueue((current) => current.filter((item) => item.id !== id));
  }

  function copyUrl(item: MediaItem) {
    navigator.clipboard.writeText(resolveMediaUrl(item, "view"));
    toast.success("Media URL copied");
  }

  function createFolderSubmit() {
    if (!resolvedWorkspaceId || !folderName.trim()) return;
    createFolderMutation.mutate({ workspaceId: resolvedWorkspaceId, name: folderName, parentId: activeFolder?._id });
  }

  function startRenameFolder(folder: FolderItem) {
    setRenameFolderTarget(folder);
    setRenameFolderName(folder.name);
  }

  function submitRenameFolder() {
    if (!renameFolderTarget || !renameFolderName.trim()) return;
    renameFolderMutation.mutate({ id: renameFolderTarget._id, name: renameFolderName.trim() });
  }

  function renameMedia(item: MediaItem) {
    const nextName = window.prompt("Rename file", item.originalName);
    if (!nextName || nextName.trim() === item.originalName) return;
    updateMedia(item._id, { originalName: nextName.trim() })
      .then(async () => {
        toast.success("File renamed");
        await queryClient.invalidateQueries({ queryKey: ["media"] });
      })
      .catch((error) => notifyError(error, "Unable to rename file."));
  }

  function openNextPreview(direction: 1 | -1) {
    if (currentImageIndex < 0 || !currentFiles.length) return;
    const next = currentFiles[(currentImageIndex + direction + currentFiles.length) % currentFiles.length];
    setPreview(next);
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#07080c]">
      <div className="sticky top-16 z-20 border-b border-border/80 bg-[#080a10]/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1680px] flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted xl:w-72">
            <button className="text-white hover:text-accent" onClick={() => setActiveFolder(null)}>Workspace</button>
            {activeFolder && <><ChevronRight size={15} /><button className="truncate text-white">{activeFolder.name}</button></>}
          </div>
          <div className="relative flex-1 xl:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={16} />
            <Input className="pl-9" placeholder="Search files, tags and folders" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2 xl:ml-auto">
            <select className="h-10 rounded-md border border-border bg-panel px-3 text-sm text-white" value={resolvedWorkspaceId} onChange={(event) => { setWorkspaceId(event.target.value); setActiveFolder(null); }}>
              {workspacesLoading ? <option>Loading workspaces...</option> : workspaces.map((workspace) => <option key={workspace._id} value={workspace._id}>{workspace.name}</option>)}
            </select>
            <Button variant="secondary" onClick={() => setNewFolderOpen(true)}><FolderPlus size={16} /> New Folder</Button>
            <Button onClick={() => setUploadOpen(true)}><UploadCloud size={16} /> Upload</Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-[1680px] lg:grid-cols-[264px_1fr]">
        <aside className="hidden border-r border-border bg-panel/30 p-4 lg:block">
          <nav className="space-y-1">
            {filterItems.map((item) => (
              <button key={item.id} onClick={() => setFilter(item.id)} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-white", filter === item.id && "bg-panel-2 text-white")}>
                <item.icon size={17} /> {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between px-3 text-xs uppercase tracking-wide text-muted">
              Folders <span>{allFolders.length}</span>
            </div>
            <div className="space-y-1">
              {allFolders.length ? allFolders.map((folder) => (
                <button key={folder._id} onClick={() => setActiveFolder(folder)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-white/5 hover:text-white", activeFolder?._id === folder._id && "bg-panel-2 text-white")}>
                  <Folder size={16} className="text-accent" />
                  <span className="truncate">{folder.path}</span>
                </button>
              )) : <p className="px-3 text-sm text-muted">No folders yet.</p>}
            </div>
          </div>
        </aside>

        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Card className="mb-6 border-border/80 bg-panel/70 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Button variant={view === "grid" ? "primary" : "secondary"} size="sm" onClick={() => setView("grid")}><Grid2X2 size={15} /></Button>
                <Button variant={view === "list" ? "primary" : "secondary"} size="sm" onClick={() => setView("list")}><LayoutList size={15} /></Button>
                <Button variant="secondary" size="sm">Sort</Button>
                <Button variant="secondary" size="sm">Filter</Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                {selected.length ? <><span>{selected.length} selected</span><Button variant="destructive" size="sm" onClick={() => selectedItems[0] && setDeleteTarget(selectedItems[0])}><Trash2 size={14} /> Delete</Button></> : <span>{currentFolders.length + currentFiles.length} items</span>}
              </div>
            </div>
          </Card>

          {mediaQuery.isLoading || foldersQuery.isLoading ? <PageLoading cards={6} /> : mediaQuery.isError ? (
            <EmptyState icon={File} title="Unable to load files" text="The explorer could not connect to your backend." action="Retry" onAction={() => mediaQuery.refetch()} />
          ) : !currentFolders.length && !currentFiles.length ? (
            <EmptyState icon={Folder} title="This folder is empty" text="Upload files or create a folder to start organizing your media." action="Upload files" onAction={() => setUploadOpen(true)} />
          ) : view === "grid" ? (
            <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6">
              {currentFolders.map((folder) => (
                <FolderCard
                  key={folder._id}
                  folder={folder}
                  onOpen={() => setActiveFolder(folder)}
                  onRename={() => startRenameFolder(folder)}
                  onDelete={() => setDeleteFolderTarget(folder)}
                />
              ))}
              {currentFiles.map((item) => <FileCard key={item._id} item={item} selected={selected.includes(item._id)} onSelect={() => toggleSelected(item._id)} onPreview={() => setPreview(item)} onDetails={() => setDetails(item)} onCopy={() => copyUrl(item)} onRename={() => renameMedia(item)} onDelete={() => setDeleteTarget(item)} onMove={(folderId) => moveMutation.mutate({ id: item._id, folderId })} folders={allFolders} />)}
            </motion.div>
          ) : (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-[36px_1fr_140px_130px_130px_44px] border-b border-border px-4 py-3 text-xs uppercase tracking-wide text-muted">
                <span /><span>Name</span><span>Type</span><span>Size</span><span>Uploaded</span><span />
              </div>
              {[...currentFolders.map((folder) => ({ type: "folder" as const, folder })), ...currentFiles.map((item) => ({ type: "file" as const, item }))].map((entry) => entry.type === "folder" ? (
                <div key={entry.folder._id} className="grid grid-cols-[36px_1fr_140px_130px_130px_120px] items-center border-b border-border/70 px-4 py-3 text-left text-sm hover:bg-white/5">
                  <Folder className="text-accent" size={18} />
                  <button className="truncate text-left font-medium text-white" onClick={() => setActiveFolder(entry.folder)}>{entry.folder.name}</button>
                  <span className="text-muted">Folder</span>
                  <span className="text-muted">-</span>
                  <span className="text-muted">-</span>
                  <div className="flex justify-end gap-1">
                    <button className="rounded p-1.5 text-muted hover:bg-white/5 hover:text-white" onClick={() => startRenameFolder(entry.folder)} title="Rename folder"><FileText size={15} /></button>
                    <button className="rounded p-1.5 text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => setDeleteFolderTarget(entry.folder)} title="Delete folder"><Trash2 size={15} /></button>
                    <button className="rounded p-1.5 text-muted hover:bg-white/5 hover:text-white" onClick={() => setActiveFolder(entry.folder)} title="Open folder"><ChevronRight size={15} /></button>
                  </div>
                </div>
              ) : (
                <FileRow key={entry.item._id} item={entry.item} selected={selected.includes(entry.item._id)} onSelect={() => toggleSelected(entry.item._id)} onPreview={() => setPreview(entry.item)} onDetails={() => setDetails(entry.item)} onCopy={() => copyUrl(entry.item)} onRename={() => renameMedia(entry.item)} onDelete={() => setDeleteTarget(entry.item)} />
              ))}
            </Card>
          )}
        </section>
      </div>

      <UploadModal open={uploadOpen} queue={queue} inputRef={uploadInputRef} onClose={() => setUploadOpen(false)} onPick={() => uploadInputRef.current?.click()} onFiles={enqueue} onUpload={startUpload} onRemove={removeUpload} />
      <input ref={uploadInputRef} className="sr-only" type="file" multiple onChange={(event) => { enqueue(event.target.files); event.currentTarget.value = ""; }} />
      <FolderModal open={newFolderOpen} value={folderName} loading={createFolderMutation.isPending} onChange={setFolderName} onClose={() => setNewFolderOpen(false)} onSubmit={createFolderSubmit} />
      <FolderModal open={!!renameFolderTarget} title="Rename folder" submitLabel="Save" value={renameFolderName} loading={renameFolderMutation.isPending} onChange={setRenameFolderName} onClose={() => setRenameFolderTarget(null)} onSubmit={submitRenameFolder} />
      <DeleteFolderModal folder={deleteFolderTarget} loading={deleteFolderMutation.isPending} onClose={() => setDeleteFolderTarget(null)} onConfirm={() => deleteFolderTarget && deleteFolderMutation.mutate({ id: deleteFolderTarget._id })} />
      <PreviewModal item={preview} onClose={() => setPreview(null)} onCopy={copyUrl} onNext={() => openNextPreview(1)} onPrevious={() => openNextPreview(-1)} hasMultiple={currentFiles.length > 1} />
      <DetailsPanel item={details} onClose={() => setDetails(null)} onCopy={copyUrl} />
      <DeleteModal item={deleteTarget} loading={deleteMutation.isPending} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)} />
    </main>
  );
}

function FolderCard({ folder, onOpen, onRename, onDelete }: { folder: FolderItem; onOpen: () => void; onRename: () => void; onDelete: () => void }) {
  return (
    <motion.div layout className="group flex min-h-64 flex-col rounded-lg border border-border bg-panel p-4 text-left shadow-[0_10px_34px_rgba(0,0,0,0.14)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:bg-panel-2">
      <button onClick={onOpen} className="grid aspect-[4/3] place-items-center rounded-md border border-border/70 bg-[#090c13]">
        <Folder className="text-accent" size={42} />
      </button>
      <div className="mt-4 flex items-start justify-between gap-3">
        <button className="min-w-0 text-left" onClick={onOpen}>
          <p className="truncate text-sm font-semibold leading-5 text-white">{folder.name}</p>
          <p className="mt-1 truncate text-xs leading-5 text-muted">{folder.path}</p>
        </button>
        <div className="flex gap-1 opacity-100 transition">
          <button className="rounded p-1.5 text-muted hover:bg-white/5 hover:text-white" onClick={onRename} title="Rename folder"><FileText size={15} /></button>
          <button className="rounded p-1.5 text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={onDelete} title="Delete folder"><Trash2 size={15} /></button>
        </div>
      </div>
    </motion.div>
  );
}

function FileCard({ item, selected, folders, onSelect, onPreview, onDetails, onCopy, onRename, onDelete, onMove }: { item: MediaItem; selected: boolean; folders: FolderItem[]; onSelect: () => void; onPreview: () => void; onDetails: () => void; onCopy: () => void; onRename: () => void; onDelete: () => void; onMove: (folderId: string | null) => void }) {
  return (
    <motion.div layout className={cn("group rounded-lg border border-border bg-panel p-3 shadow-[0_10px_34px_rgba(0,0,0,0.14)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:bg-panel-2", selected && "border-accent ring-1 ring-accent/40")}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-border/70 bg-[#090c13] text-accent">
        {item.mimeType.startsWith("image/") ? <MediaImage id={item._id} alt={item.originalName} /> : <div className="grid h-full place-items-center"><MediaTypeIcon item={item} size={40} /></div>}
        <input aria-label="Select file" type="checkbox" checked={selected} onChange={onSelect} className="absolute left-3 top-3 h-4 w-4 accent-[#5b8cff]" />
        <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <button className="rounded-md bg-black/55 p-2 text-white backdrop-blur transition hover:bg-white/15" onClick={onPreview} title="Preview"><Eye size={15} /></button>
          <button className="rounded-md bg-black/55 p-2 text-white backdrop-blur transition hover:bg-white/15" onClick={onCopy} title="Copy URL"><Copy size={15} /></button>
          <button className="rounded-md bg-black/55 p-2 text-white backdrop-blur transition hover:bg-white/15" onClick={onRename} title="Rename"><FileText size={15} /></button>
          <button className="rounded-md bg-red-500/90 p-2 text-white backdrop-blur transition hover:bg-red-400" onClick={onDelete} title="Delete"><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-5 text-white">{item.originalName}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{formatBytes(item.size)} - {new Date(item.createdAt).toLocaleDateString()}</p>
        </div>
        <button className="rounded-md p-1.5 text-muted transition hover:bg-white/5 hover:text-white" onClick={onDetails} title="Details"><Info size={16} /></button>
      </div>
      <select className="mt-3 h-9 w-full rounded-md border border-border bg-[#090c13] px-2 text-xs text-muted outline-none transition focus:border-accent" value={item.folderId ?? ""} onChange={(event) => onMove(event.target.value || null)}>
          <option value="">Root</option>
          {folders.map((folder) => <option key={folder._id} value={folder._id}>{folder.name}</option>)}
      </select>
    </motion.div>
  );
}

function FileRow({ item, selected, onSelect, onPreview, onDetails, onCopy, onRename, onDelete }: { item: MediaItem; selected: boolean; onSelect: () => void; onPreview: () => void; onDetails: () => void; onCopy: () => void; onRename: () => void; onDelete: () => void }) {
  return (
    <div className="grid grid-cols-[36px_1fr_140px_130px_130px_44px] items-center border-b border-border/70 px-4 py-3 text-sm hover:bg-white/5">
      <input aria-label="Select file" type="checkbox" checked={selected} onChange={onSelect} className="h-4 w-4 accent-[#5b8cff]" />
      <button className="flex min-w-0 items-center gap-3 text-left" onClick={onPreview}><MediaTypeIcon item={item} /><span className="truncate font-medium text-white">{item.originalName}</span></button>
      <span className="truncate text-muted">{item.mimeType}</span>
      <span className="text-muted">{formatBytes(item.size)}</span>
      <span className="text-muted">{new Date(item.createdAt).toLocaleDateString()}</span>
      <button className="rounded p-1 text-muted hover:bg-white/5 hover:text-white" onClick={onDetails}><MoreHorizontal size={17} /></button>
      <div className="col-span-6 hidden gap-2 py-2 md:flex">
        <Button size="sm" variant="secondary" onClick={onCopy}><Copy size={14} /> Copy URL</Button>
        <Button size="sm" variant="secondary" onClick={onRename}><FileText size={14} /> Rename</Button>
        <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 size={14} /> Delete</Button>
      </div>
    </div>
  );
}

function UploadModal({ open, queue, inputRef, onClose, onPick, onFiles, onUpload, onRemove }: { open: boolean; queue: UploadItem[]; inputRef: React.RefObject<HTMLInputElement | null>; onClose: () => void; onPick: () => void; onFiles: (files?: FileList | null) => void; onUpload: (item: UploadItem) => void; onRemove: (id: string) => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ y: 16, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 16, opacity: 0, scale: 0.98 }} className="w-full max-w-2xl rounded-lg border border-border bg-panel p-5 shadow-2xl">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Upload files</h2><button className="text-muted hover:text-white" onClick={onClose}><X size={18} /></button></div>
            <label className="mt-4 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-700 bg-panel-2 text-center transition hover:border-accent/60">
              <UploadCloud className="mb-3 text-accent" /><span className="text-sm font-medium text-white">Drop files or browse</span><span className="mt-1 text-xs text-muted">Images, videos, PDFs, ZIPs and documents</span>
              <input ref={inputRef} className="sr-only" type="file" multiple onChange={(event) => { onFiles(event.target.files); event.currentTarget.value = ""; }} />
            </label>
            <div className="mt-4 max-h-80 space-y-3 overflow-auto thin-scrollbar">
              {queue.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-[#090c13] p-3">
                  <div className="flex items-center gap-3">
                    {item.preview ? <img src={item.preview} className="h-10 w-10 rounded object-cover" alt="" /> : <div className="grid h-10 w-10 place-items-center rounded bg-panel-2 text-xs text-muted">File</div>}
                    <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{item.file.name}</p><p className="text-xs text-muted">{item.status} - {formatBytes(item.file.size)}</p></div>
                    {item.status === "failed" && <XCircle className="text-red-300" size={18} />}
                    <button className="rounded p-1 text-muted hover:bg-white/5 hover:text-white" onClick={() => onRemove(item.id)}><X size={16} /></button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded bg-slate-800"><div className="h-full bg-accent transition-all" style={{ width: `${item.progress}%` }} /></div>
                  <div className="mt-3 flex justify-end gap-2">
                    <LoadingButton size="sm" loading={item.status === "uploading"} loadingText="Uploading..." disabled={item.status === "success"} onClick={() => onUpload(item)}>{item.status === "failed" ? <><RefreshCw size={14} /> Retry</> : "Upload"}</LoadingButton>
                    <Button size="sm" variant="ghost" disabled={item.status !== "uploading"} onClick={() => onRemove(item.id)}><Pause size={14} /> Cancel</Button>
                  </div>
                </div>
              ))}
            </div>
            {!queue.length && <div className="mt-4 flex justify-end"><Button onClick={onPick}><UploadCloud size={16} /> Choose files</Button></div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FolderModal({ open, title = "Create folder", submitLabel = "Create", value, loading, onChange, onClose, onSubmit }: { open: boolean; title?: string; submitLabel?: string; value: string; loading: boolean; onChange: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  return (
    <AnimatePresence>
      {open && <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Card className="w-full max-w-md p-5">
          <h2 className="font-semibold text-white">{title}</h2>
          <Input className="mt-4" placeholder="Folder name" value={value} onChange={(event) => onChange(event.target.value)} autoFocus />
          <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><LoadingButton loading={loading} loadingText="Saving..." onClick={onSubmit}><FolderPlus size={15} /> {submitLabel}</LoadingButton></div>
        </Card>
      </motion.div>}
    </AnimatePresence>
  );
}

function DeleteFolderModal({ folder, loading, onClose, onConfirm }: { folder: FolderItem | null; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {folder && <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Card className="w-full max-w-md border-red-500/30 p-5">
          <div className="flex items-center gap-3 text-red-300"><Trash2 /><h2 className="font-semibold">Delete folder?</h2></div>
          <p className="mt-3 text-sm leading-6 text-muted">Only empty folders can be deleted. Files inside this folder will stay untouched unless you delete or move them first.</p>
          <p className="mt-3 truncate rounded bg-[#090c13] p-2 text-sm text-white">{folder.path}</p>
          <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={loading} onClick={onClose}>Cancel</Button><LoadingButton className="bg-red-500 hover:bg-red-400" loading={loading} loadingText="Deleting..." onClick={onConfirm}><Trash2 size={15} /> Delete folder</LoadingButton></div>
        </Card>
      </motion.div>}
    </AnimatePresence>
  );
}

function PreviewModal({ item, onClose, onCopy, onNext, onPrevious, hasMultiple }: { item: MediaItem | null; onClose: () => void; onCopy: (item: MediaItem) => void; onNext: () => void; onPrevious: () => void; hasMultiple: boolean }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onNext();
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "+" || event.key === "=") setZoom((value) => Math.min(value + 0.2, 2.4));
      if (event.key === "-") setZoom((value) => Math.max(value - 0.2, 0.6));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose, onNext, onPrevious]);

  return (
    <AnimatePresence>
      {item && <motion.div className="fixed inset-0 z-50 bg-black/82 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{item.originalName}</p>
            <p className="text-xs text-slate-400">{formatBytes(item.size)} - {item.mimeType}</p>
          </div>
          <div className="flex items-center gap-2">
            {item.mimeType.startsWith("image/") && <><Button variant="ghost" size="sm" onClick={() => setZoom((value) => Math.max(value - 0.2, 0.6))}><ZoomOut size={15} /></Button><Button variant="ghost" size="sm" onClick={() => setZoom((value) => Math.min(value + 0.2, 2.4))}><ZoomIn size={15} /></Button></>}
            <Button variant="secondary" size="sm" onClick={() => onCopy(item)}><Copy size={15} /> Copy</Button>
            <Button variant="secondary" size="sm" onClick={() => window.open(resolveMediaUrl(item, "download"), "_blank")}><Download size={15} /> Open</Button>
            <button className="rounded-md bg-white/10 p-2 text-white transition hover:bg-white/15" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        {hasMultiple && <button className="absolute left-5 top-1/2 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/15" onClick={onPrevious}><ChevronLeft size={20} /></button>}
        {hasMultiple && <button className="absolute right-5 top-1/2 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/15" onClick={onNext}><ChevronRight size={20} /></button>}
        <div className="grid h-full place-items-center pt-14">
          {item.mimeType.startsWith("image/") ? (
            <div className="max-h-[84vh] max-w-[92vw] overflow-auto thin-scrollbar">
              <img src={`/media/${item._id}/view`} alt={item.originalName} loading="lazy" onError={() => toast.error("Image preview failed")} className="rounded-lg object-contain shadow-2xl transition duration-200" style={{ maxHeight: "84vh", maxWidth: "92vw", transform: `scale(${zoom})` }} />
            </div>
          ) : item.mimeType.startsWith("video/") ? <video src={`/media/${item._id}/view`} controls preload="metadata" className="max-h-[84vh] max-w-[92vw] rounded-lg shadow-2xl" /> : <Card className="p-8 text-center"><File className="mx-auto text-accent" /><p className="mt-4 text-white">{item.originalName}</p><Button className="mt-4" onClick={() => window.open(resolveMediaUrl(item, "download"), "_blank")}><Download size={15} /> Open file</Button></Card>}
        </div>
      </motion.div>}
    </AnimatePresence>
  );
}

function DetailsPanel({ item, onClose, onCopy }: { item: MediaItem | null; onClose: () => void; onCopy: (item: MediaItem) => void }) {
  return (
    <AnimatePresence>
      {item && <motion.aside initial={{ x: 360 }} animate={{ x: 0 }} exit={{ x: 360 }} className="fixed inset-y-0 right-0 z-40 w-full max-w-sm border-l border-border bg-panel p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Details</h2><button className="text-muted hover:text-white" onClick={onClose}><X size={18} /></button></div>
        <div className="mt-6 aspect-video overflow-hidden rounded-lg border border-border bg-[#090c13] text-accent">{item.mimeType.startsWith("image/") ? <MediaImage id={item._id} alt={item.originalName} /> : <div className="grid h-full place-items-center"><MediaTypeIcon item={item} size={34} /></div>}</div>
        <div className="mt-5 space-y-3 text-sm">
          {[["Name", item.originalName], ["Size", formatBytes(item.size)], ["Type", item.mimeType], ["Status", item.status], ["Uploaded", new Date(item.createdAt).toLocaleString()], ["Telegram", "Stored"]].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-border pb-2"><span className="text-muted">{label}</span><span className="truncate text-white">{value}</span></div>
          ))}
        </div>
        <Button className="mt-5 w-full" onClick={() => onCopy(item)}><Copy size={15} /> Copy URL</Button>
      </motion.aside>}
    </AnimatePresence>
  );
}

function DeleteModal({ item, loading, onClose, onConfirm }: { item: MediaItem | null; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {item && <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Card className="w-full max-w-md border-red-500/30 p-5">
          <div className="flex items-center gap-3 text-red-300"><Trash2 /><h2 className="font-semibold">Delete media?</h2></div>
          <p className="mt-3 text-sm leading-6 text-muted">This removes the file from Telegram and deletes the database record. This action cannot be undone.</p>
          <p className="mt-3 truncate rounded bg-[#090c13] p-2 text-sm text-white">{item.originalName}</p>
          <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={loading} onClick={onClose}>Cancel</Button><LoadingButton className="bg-red-500 hover:bg-red-400" loading={loading} loadingText="Deleting..." onClick={onConfirm}><Trash2 size={15} /> Delete</LoadingButton></div>
        </Card>
      </motion.div>}
    </AnimatePresence>
  );
}
