import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
  RotateCcw,
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
  bulkRestoreMedia,
  deleteFolder,
  deleteMedia,
  ensureFolderPath,
  getFolders,
  getMedia,
  getWorkspaces,
  notifyError,
  renameFolder,
  restoreMedia,
  syncWorkspace,
  updateMedia,
  uploadMedia,
  type FolderItem,
  type MediaItem,
  type Workspace
} from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { withApiBase } from "@/lib/url";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

type ViewMode = "grid" | "list";
type UploadStatus = "queued" | "uploading" | "processing" | "success" | "failed" | "canceled";
type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  preview?: string;
  uploadedBytes?: number;
  speed?: number;
  etaSeconds?: number;
  error?: string;
  startedAt?: number;
  folderPath?: string;
};
type ExplorerFilter = "all" | "images" | "videos" | "documents" | "recent" | "favorites" | "trash" | "shared";
const MAX_SINGLE_FILE_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_CONCURRENT_UPLOADS = 3;

declare module "react" {
  interface InputHTMLAttributes<T> extends React.HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

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
  const src = withApiBase(`/media/${id}/view`);
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
      {!loaded && <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,rgba(255,255,255,0.03),rgba(255,255,255,0.09),rgba(255,255,255,0.03))] bg-size-[200%_100%]" />}
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
  if (relative) return relative.startsWith("http") ? relative : withApiBase(relative);
  return withApiBase(`/media/${item._id}/${kind === "thumb" ? "thumb" : kind}`);
}

function uploadKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export default function Media() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const uploadRequestId = useUiStore((state) => state.uploadRequestId);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const controllers = useRef(new Map<string, AbortController>());
  const inFlightUploads = useRef(new Set<string>());
  const queueRef = useRef<UploadItem[]>([]);
  const ensuredFolders = useRef(new Map<string, string>());
  const [workspaceId, setWorkspaceId] = useState("");
  const [filter, setFilter] = useState<ExplorerFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<MediaItem | null>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [manualUploadOpen, setManualUploadOpen] = useState(false);
  const [handledUploadRequestId, setHandledUploadRequestId] = useState(uploadRequestId);
  const [dismissedRouteUpload, setDismissedRouteUpload] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renameFolderTarget, setRenameFolderTarget] = useState<FolderItem | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderItem | null>(null);
  const [queue, setQueue] = useState<UploadItem[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    const activeControllers = controllers.current;
    return () => {
      activeControllers.forEach((controller) => controller.abort());
      queueRef.current.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  const routeRequestsUpload = Boolean((location.state as { openUpload?: boolean } | null)?.openUpload);
  const uploadOpen = manualUploadOpen || uploadRequestId > handledUploadRequestId || (routeRequestsUpload && !dismissedRouteUpload);

  const openUploadModal = useCallback(() => {
    setManualUploadOpen(true);
    setDismissedRouteUpload(false);
  }, []);

  const closeUploadModal = useCallback(() => {
    setManualUploadOpen(false);
    setHandledUploadRequestId(uploadRequestId);
    setDismissedRouteUpload(true);
  }, [uploadRequestId]);

  const { data: workspaces = [], isLoading: workspacesLoading } = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });
  const activeWorkspace: Workspace | undefined = useMemo(() => workspaces.find((workspace) => workspace._id === workspaceId) ?? workspaces[0], [workspaceId, workspaces]);
  const resolvedWorkspaceId = activeWorkspace?._id ?? "";

  const mediaQuery = useQuery({ queryKey: ["media"], queryFn: () => getMedia({ includeDeleted: true }) });
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
    onSuccess: async () => {
      toast.success("Folder renamed");
      setRenameFolderTarget(null);
      setRenameFolderName("");
      await queryClient.invalidateQueries({ queryKey: ["folders", resolvedWorkspaceId] });
    },
    onError: (error) => notifyError(error, "Unable to rename folder.")
  });

  const deleteFolderMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteFolder(id, resolvedWorkspaceId),
    onSuccess: async (_result, variables) => {
      toast.success("Folder deleted");
      if (activeFolder?._id === variables.id) {
        const next = new URLSearchParams(searchParams);
        next.delete("folder");
        setSearchParams(next, { replace: true });
      }
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteMedia(id)));
      return ids;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["media"] });
      const previous = queryClient.getQueryData<MediaItem[]>(["media"]);
      queryClient.setQueryData<MediaItem[]>(["media"], (current = []) => {
        const idSet = new Set(ids);
        if (filter === "trash") return current.filter((item) => !idSet.has(item._id));
        return current.map((item) => idSet.has(item._id) ? { ...item, status: "deleted" } : item);
      });
      return { previous };
    },
    onSuccess: async (_ids, variables) => {
      toast.success(`${variables.length} file${variables.length > 1 ? "s" : ""} deleted`);
      setBulkDeleteIds([]);
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(["media"], context.previous);
      notifyError(error, "Unable to delete selected media.");
    }
  });

  const restoreMutation = useMutation({
    mutationFn: restoreMedia,
    onSuccess: async () => {
      toast.success("Media restored");
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (error) => notifyError(error, "Unable to restore media.")
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: bulkRestoreMedia,
    onSuccess: async (result) => {
      toast.success(`Restored ${result.restored} file${result.restored === 1 ? "" : "s"}`);
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (error) => notifyError(error, "Unable to restore selected media.")
  });

  const syncMutation = useMutation({
    mutationFn: syncWorkspace,
    onSuccess: async (result) => {
      toast.success(result.removed ? `Synced. Removed ${result.removed} missing file${result.removed > 1 ? "s" : ""}.` : `Synced. Checked ${result.checked} files.`);
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (error) => notifyError(error, "Unable to sync Telegram files.")
  });

  const allFolders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const folderIdFromUrl = searchParams.get("folder");
  const activeFolder = folderIdFromUrl ? allFolders.find((item) => item._id === folderIdFromUrl) ?? null : null;
  const activeFolderPath = activeFolder?.path;
  const media = useMemo(() => mediaQuery.data ?? [], [mediaQuery.data]);
  const currentFolderId = folderIdFromUrl ?? undefined;

  const openFolder = useCallback((folder: FolderItem | null, replace = false) => {
    const next = new URLSearchParams(searchParams);
    if (folder) next.set("folder", folder._id);
    else next.delete("folder");
    setSearchParams(next, { replace });
  }, [searchParams, setSearchParams]);
  const currentFiles = useMemo(() => {
    return media
      .filter((item) => {
        if (filter === "trash") return item.status === "deleted";
        return item.status !== "deleted";
      })
      .filter((item) => filter === "trash" || (currentFolderId ? item.folderId === currentFolderId : !item.folderId))
      .filter((item) => {
        if (filter === "images") return item.mimeType.startsWith("image/");
        if (filter === "videos") return item.mimeType.startsWith("video/");
        if (filter === "documents") return !item.mimeType.startsWith("image/") && !item.mimeType.startsWith("video/");
        return true;
      })
      .filter((item) => item.originalName.toLowerCase().includes(query.toLowerCase()) || item.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase())));
  }, [media, currentFolderId, filter, query]);

  const currentFolders = filter === "trash" ? [] : allFolders.filter((folder) => (currentFolderId ? folder.parentId === currentFolderId : !folder.parentId));
  const selectedItems = currentFiles.filter((item) => selected.includes(item._id));
  const allCurrentFileIds = currentFiles.map((item) => item._id);
  const allCurrentSelected = allCurrentFileIds.length > 0 && allCurrentFileIds.every((id) => selected.includes(id));
  const currentImageIndex = preview ? currentFiles.findIndex((item) => item._id === preview._id) : -1;
  const storageLimitBytes = activeWorkspace?.storageLimitBytes ?? 0;
  const storagePercent = storageLimitBytes > 0 ? Math.min(((activeWorkspace?.storageUsed ?? 0) / storageLimitBytes) * 100, 100) : 0;
  const queueStats = {
    total: queue.length,
    uploading: queue.filter((item) => item.status === "uploading" || item.status === "processing").length,
    failed: queue.filter((item) => item.status === "failed").length,
    completed: queue.filter((item) => item.status === "success").length
  };

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const requireWorkspace = useCallback(() => {
    if (resolvedWorkspaceId) return true;
    toast.error("Create a workspace before uploading.");
    navigate("/app/workspaces");
    return false;
  }, [navigate, resolvedWorkspaceId]);

  function selectAllCurrent() {
    setSelected((current) => Array.from(new Set([...current, ...allCurrentFileIds])));
  }

  function deselectAllCurrent() {
    const visible = new Set(allCurrentFileIds);
    setSelected((current) => current.filter((id) => !visible.has(id)));
  }

  const enqueue = useCallback((files?: FileList | null) => {
    if (!requireWorkspace()) return;
    if (!files?.length) return;
    const existing = new Set(queueRef.current.map((item) => uploadKey(item.file)));
    const accepted: File[] = [];
    let duplicateCount = 0;
    let oversizedCount = 0;

    for (const file of Array.from(files)) {
      const key = uploadKey(file);
      if (existing.has(key)) {
        duplicateCount += 1;
        continue;
      }
      if (file.size > MAX_SINGLE_FILE_BYTES) {
        oversizedCount += 1;
        continue;
      }
      existing.add(key);
      accepted.push(file);
    }

    const incoming = accepted.map((file) => {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
      const folderPath = relativePath ? relativePath.split("/").slice(0, -1).join("/") : undefined;
      return {
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "queued" as const,
        uploadedBytes: 0,
        folderPath,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
      };
    });

    if (oversizedCount) {
      toast.error(`${oversizedCount} file${oversizedCount > 1 ? "s are" : " is"} larger than the 2 GB single-file limit.`);
    }
    if (duplicateCount) {
      toast("Duplicate files were skipped", { icon: "!" });
    }

    if (!incoming.length) {
      return;
    }
    setQueue((current) => [...incoming, ...current]);
    openUploadModal();
  }, [openUploadModal, requireWorkspace]);

  const removeUpload = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    inFlightUploads.current.delete(id);
    setQueue((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const startUpload = useCallback(async (item: UploadItem) => {
    if (!resolvedWorkspaceId) {
      requireWorkspace();
      return;
    }
    if (controllers.current.has(item.id) || inFlightUploads.current.has(item.id)) return;
    inFlightUploads.current.add(item.id);
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    const startedAt = Date.now();
    setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "uploading", progress: 1, uploadedBytes: 0, speed: 0, etaSeconds: undefined, error: undefined, startedAt } : q));
    try {
      let targetFolderId = currentFolderId;
      if (item.folderPath) {
        const cacheKey = `${resolvedWorkspaceId}:${currentFolderId ?? "root"}:${item.folderPath}`;
        targetFolderId = ensuredFolders.current.get(cacheKey);
        if (!targetFolderId) {
          const folder = await ensureFolderPath({ workspaceId: resolvedWorkspaceId, parentId: currentFolderId, path: item.folderPath });
          targetFolderId = folder._id;
          ensuredFolders.current.set(cacheKey, targetFolderId);
          await queryClient.invalidateQueries({ queryKey: ["folders", resolvedWorkspaceId] });
        }
      }

      const folderPath = item.folderPath
        ? item.folderPath.split("/").filter(Boolean)
        : activeFolderPath
          ? activeFolderPath.split("/").filter(Boolean)
          : [];
      const result = await uploadMedia(item.file, resolvedWorkspaceId, (progress, loaded = 0, total = item.file.size) => {
        if (!controller.signal.aborted) {
          const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.2);
          const speed = loaded / elapsedSeconds;
          const remainingBytes = Math.max(total - loaded, 0);
          const etaSeconds = speed > 0 ? Math.ceil(remainingBytes / speed) : undefined;
          setQueue((current) => current.map((q) => q.id === item.id ? { ...q, progress, uploadedBytes: loaded, speed, etaSeconds } : q));
        }
      }, controller.signal, { folderId: targetFolderId, folderPath });
      if (controller.signal.aborted) return;
      setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "processing", progress: 100, uploadedBytes: item.file.size } : q));
      window.setTimeout(() => {
        setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "success", progress: 100 } : q));
      }, 350);
      toast.success(result.duplicate ? "This file already exists in your workspace." : "Upload complete");
      await queryClient.invalidateQueries({ queryKey: ["media"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setTimeout(() => removeUpload(item.id), 1800);
    } catch (error) {
      if (axios.isCancel(error) || controller.signal.aborted) {
        setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "canceled", progress: 0 } : q));
        window.setTimeout(() => removeUpload(item.id), 500);
        return;
      }
      setQueue((current) => current.map((q) => q.id === item.id ? { ...q, status: "failed", error: "Upload failed. Please retry." } : q));
      notifyError(error, "Upload failed. Please retry.");
    } finally {
      controllers.current.delete(item.id);
      inFlightUploads.current.delete(item.id);
    }
  }, [activeFolderPath, currentFolderId, queryClient, removeUpload, requireWorkspace, resolvedWorkspaceId]);

  const cancelUpload = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    setQueue((current) => current.map((item) => item.id === id ? { ...item, status: "canceled", progress: 0 } : item));
    window.setTimeout(() => removeUpload(id), 500);
  }, [removeUpload]);

  const clearCompletedUploads = useCallback(() => {
    setQueue((current) => {
      const removable = new Set(["success", "failed", "canceled"]);
      current.forEach((item) => {
        if (removable.has(item.status) && item.preview) URL.revokeObjectURL(item.preview);
      });
      return current.filter((item) => !removable.has(item.status));
    });
  }, []);

  const startQueuedUploads = useCallback(() => {
    if (!resolvedWorkspaceId) {
      requireWorkspace();
      return;
    }
    const active = queueRef.current.filter((item) => item.status === "uploading" || item.status === "processing").length;
    const slots = Math.max(MAX_CONCURRENT_UPLOADS - active, 0);
    if (!slots) return;
    queueRef.current
      .filter((item) => item.status === "queued")
      .slice(0, slots)
      .forEach((item) => void startUpload(item));
  }, [requireWorkspace, resolvedWorkspaceId, startUpload]);

  useEffect(() => {
    if (!resolvedWorkspaceId || !queue.some((item) => item.status === "queued")) return;
    const timer = window.setTimeout(startQueuedUploads, 50);
    return () => window.clearTimeout(timer);
  }, [queue, resolvedWorkspaceId, startQueuedUploads]);

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
    <main className="min-h-[calc(100vh-4rem)] bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <div className="sticky top-14 z-20 border-b border-border/80 bg-[#080b11]/90 px-3 py-3 backdrop-blur-xl sm:top-16 sm:px-6 sm:py-4 lg:px-8">
        <div className="mx-auto flex max-w-420 flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted xl:w-72">
            <button className="text-white hover:text-accent" onClick={() => openFolder(null)}>Workspace</button>
            {activeFolder && <><ChevronRight size={15} /><button className="truncate text-white">{activeFolder.name}</button></>}
          </div>
          <div className="relative flex-1 xl:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={16} />
            <Input className="h-11 pl-9 text-base sm:h-10 sm:text-sm" placeholder="Search files, tags and folders" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:ml-auto">
            <select className="col-span-2 h-11 min-w-0 rounded-md border border-border bg-panel px-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:col-span-1 sm:h-10" value={resolvedWorkspaceId} onChange={(event) => { setWorkspaceId(event.target.value); openFolder(null); }}>
              {workspacesLoading ? <option>Loading workspaces...</option> : workspaces.map((workspace) => <option key={workspace._id} value={workspace._id}>{workspace.name}</option>)}
            </select>
            <LoadingButton variant="secondary" loading={syncMutation.isPending} loadingText="Syncing..." disabled={!resolvedWorkspaceId} onClick={() => resolvedWorkspaceId && syncMutation.mutate(resolvedWorkspaceId)}><RefreshCw size={16} /> Sync</LoadingButton>
            <Button variant="secondary" onClick={() => setNewFolderOpen(true)}><FolderPlus size={16} /> New Folder</Button>
            <Button onClick={() => requireWorkspace() && openUploadModal()}><UploadCloud size={16} /> Upload</Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-420 lg:grid-cols-[264px_1fr]">
        <aside className="hidden border-r border-border bg-white/[0.018] p-4 lg:block">
          <nav className="space-y-1">
            {filterItems.map((item) => (
              <button key={item.id} onClick={() => setFilter(item.id)} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted transition hover:bg-white/5.5 hover:text-white", filter === item.id && "bg-white/7.5 text-white shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12)]")}>
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
                <button key={folder._id} onClick={() => openFolder(folder)} className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted transition hover:bg-white/5.5 hover:text-white", activeFolder?._id === folder._id && "bg-white/7.5 text-white")}>
                  <Folder size={16} className="text-accent" />
                  <span className="truncate">{folder.path}</span>
                </button>
              )) : <p className="px-3 text-sm text-muted">No folders yet.</p>}
            </div>
          </div>
        </aside>

        <section className="min-w-0 p-3 sm:p-6 lg:p-8">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {filterItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-white/[0.035] px-3 text-sm text-muted",
                  filter === item.id && "border-accent/40 bg-accent/15 text-white"
                )}
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
          </div>
          <Card className="mb-6 overflow-hidden p-0">
            <div
              className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[1.2fr_0.8fr]"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                enqueue(event.dataTransfer.files);
              }}
            >
              <div className="rounded-lg border border-dashed border-slate-700 bg-[linear-gradient(135deg,rgba(91,140,255,0.12),rgba(255,255,255,0.025))] p-4 transition hover:border-accent/70 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-md border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                      <UploadCloud size={14} /> Universal uploader
                    </div>
                    <h2 className="mt-4 text-xl font-semibold tracking-tight text-white sm:text-2xl">Drop files to upload</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                      Upload images, videos, PDFs, ZIPs and documents into {activeFolder ? activeFolder.name : "Root"}. Files start automatically with up to {MAX_CONCURRENT_UPLOADS} parallel uploads.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:flex sm:flex-wrap">
                    <Button onClick={() => requireWorkspace() && uploadInputRef.current?.click()}><UploadCloud size={16} /> Choose files</Button>
                    <Button variant="secondary" onClick={() => requireWorkspace() && folderInputRef.current?.click()}><FolderPlus size={16} /> Upload folder</Button>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-4">
                  <UploadMetric label="Single file limit" value="2 GB" />
                  <UploadMetric label="Queue" value={String(queueStats.total)} />
                  <UploadMetric label="Active" value={String(queueStats.uploading)} />
                  <UploadMetric label="Failed" value={String(queueStats.failed)} tone={queueStats.failed ? "danger" : "default"} />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-[#090c13]/70 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{activeWorkspace?.name ?? "No workspace"}</p>
                    <p className="mt-1 text-xs text-muted">Storage usage</p>
                  </div>
                  <span className="rounded-md border border-border bg-white/[0.035] px-2.5 py-1 text-xs text-muted">
                    {storageLimitBytes > 0 ? `${storagePercent.toFixed(0)}% used` : "Unlimited"}
                  </span>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded bg-slate-800">
                  <div className="h-full rounded bg-accent transition-all" style={{ width: `${storageLimitBytes > 0 ? storagePercent : 8}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>{formatBytes(activeWorkspace?.storageUsed ?? 0)} used</span>
                  <span>{storageLimitBytes > 0 ? formatBytes(storageLimitBytes) : "No fixed cap"}</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-border bg-white/2.5 p-3"><p className="text-muted">Files</p><p className="mt-1 font-semibold text-white">{activeWorkspace?.uploadCount ?? 0}</p></div>
                  <div className="rounded-md border border-border bg-white/2.5 p-3"><p className="text-muted">Completed</p><p className="mt-1 font-semibold text-white">{queueStats.completed}</p></div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="sticky top-35 z-10 mb-5 p-2 backdrop-blur-xl sm:top-22 sm:mb-6 sm:p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <Button variant={view === "grid" ? "primary" : "secondary"} size="sm" onClick={() => setView("grid")}><Grid2X2 size={15} /></Button>
                <Button variant={view === "list" ? "primary" : "secondary"} size="sm" onClick={() => setView("list")}><LayoutList size={15} /></Button>
                <Button variant="outline" size="sm">Sort</Button>
                <Button variant="outline" size="sm">Filter</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                {currentFiles.length > 0 && (
                  <Button variant="outline" size="sm" onClick={allCurrentSelected ? deselectAllCurrent : selectAllCurrent}>
                    {allCurrentSelected ? "Deselect all" : "Select all"}
                  </Button>
                )}
                {selectedItems.length ? (
                  <>
                    <span>{selectedItems.length} selected</span>
                    <Button variant="ghost" size="sm" onClick={deselectAllCurrent}>Clear</Button>
                    {filter === "trash" && <LoadingButton variant="secondary" size="sm" loading={bulkRestoreMutation.isPending} loadingText="Restoring..." onClick={() => bulkRestoreMutation.mutate(selectedItems.map((item) => item._id))}><RotateCcw size={14} /> Restore selected</LoadingButton>}
                    <Button variant="destructive" size="sm" onClick={() => setBulkDeleteIds(selectedItems.map((item) => item._id))}><Trash2 size={14} /> Delete selected</Button>
                  </>
                ) : <span>{currentFolders.length + currentFiles.length} items</span>}
              </div>
            </div>
          </Card>

          {mediaQuery.isLoading || foldersQuery.isLoading ? <PageLoading cards={6} /> : mediaQuery.isError ? (
            <EmptyState icon={File} title="Unable to load files" text="The explorer could not connect to your backend." action="Retry" onAction={() => mediaQuery.refetch()} />
          ) : !currentFolders.length && !currentFiles.length ? (
            <EmptyState icon={Folder} title="This folder is empty" text="Upload files or create a folder to start organizing your media." action="Upload files" onAction={() => requireWorkspace() && openUploadModal()} />
          ) : view === "grid" ? (
            <motion.div layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6">
              {currentFolders.map((folder) => (
                <FolderCard
                  key={folder._id}
                  folder={folder}
                  onOpen={() => openFolder(folder)}
                  onRename={() => startRenameFolder(folder)}
                  onDelete={() => setDeleteFolderTarget(folder)}
                />
              ))}
              {currentFiles.map((item) => <FileCard key={item._id} item={item} selected={selected.includes(item._id)} onSelect={() => toggleSelected(item._id)} onPreview={() => setPreview(item)} onDetails={() => setDetails(item)} onCopy={() => copyUrl(item)} onRename={() => renameMedia(item)} onDelete={() => setDeleteTarget(item)} onRestore={filter === "trash" ? () => restoreMutation.mutate(item._id) : undefined} onMove={(folderId) => moveMutation.mutate({ id: item._id, folderId })} folders={allFolders} />)}
            </motion.div>
          ) : (
            <Card className="overflow-hidden">
              <div className="hidden grid-cols-[36px_1fr_140px_130px_130px_44px] border-b border-border px-4 py-3 text-xs uppercase tracking-wide text-muted md:grid">
                <span /><span>Name</span><span>Type</span><span>Size</span><span>Uploaded</span><span />
              </div>
              {[...currentFolders.map((folder) => ({ type: "folder" as const, folder })), ...currentFiles.map((item) => ({ type: "file" as const, item }))].map((entry) => entry.type === "folder" ? (
                <div key={entry.folder._id} className="grid grid-cols-[32px_1fr_auto] gap-3 border-b border-border/70 px-3 py-3 text-left text-sm hover:bg-white/5 md:grid-cols-[36px_1fr_140px_130px_130px_120px] md:items-center md:px-4">
                  <Folder className="text-accent" size={18} />
                  <button className="truncate text-left font-medium text-white" onClick={() => openFolder(entry.folder)}>{entry.folder.name}</button>
                  <span className="hidden text-muted md:block">Folder</span>
                  <span className="hidden text-muted md:block">-</span>
                  <span className="hidden text-muted md:block">-</span>
                  <div className="flex justify-end gap-1">
                    <button className="rounded p-1.5 text-muted hover:bg-white/5 hover:text-white" onClick={() => startRenameFolder(entry.folder)} title="Rename folder"><FileText size={15} /></button>
                    <button className="rounded p-1.5 text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => setDeleteFolderTarget(entry.folder)} title="Delete folder"><Trash2 size={15} /></button>
                    <button className="rounded p-1.5 text-muted hover:bg-white/5 hover:text-white" onClick={() => openFolder(entry.folder)} title="Open folder"><ChevronRight size={15} /></button>
                  </div>
                </div>
              ) : (
                <FileRow key={entry.item._id} item={entry.item} selected={selected.includes(entry.item._id)} onSelect={() => toggleSelected(entry.item._id)} onPreview={() => setPreview(entry.item)} onDetails={() => setDetails(entry.item)} onCopy={() => copyUrl(entry.item)} onRename={() => renameMedia(entry.item)} onRestore={filter === "trash" ? () => restoreMutation.mutate(entry.item._id) : undefined} onDelete={() => setDeleteTarget(entry.item)} />
              ))}
            </Card>
          )}
        </section>
      </div>

      <UploadModal
        open={uploadOpen}
        queue={queue}
        onClose={closeUploadModal}
        onPick={() => requireWorkspace() && uploadInputRef.current?.click()}
        onPickFolder={() => requireWorkspace() && folderInputRef.current?.click()}
        onFiles={enqueue}
        onUpload={startUpload}
        onCancel={cancelUpload}
        onRemove={removeUpload}
        onClearCompleted={clearCompletedUploads}
        onStartQueued={startQueuedUploads}
      />
      <input ref={uploadInputRef} className="sr-only" type="file" multiple onChange={(event) => { enqueue(event.target.files); event.currentTarget.value = ""; }} />
      <input ref={folderInputRef} className="sr-only" type="file" multiple webkitdirectory="" directory="" onChange={(event) => { enqueue(event.target.files); event.currentTarget.value = ""; }} />
      <FolderModal open={newFolderOpen} value={folderName} loading={createFolderMutation.isPending} onChange={setFolderName} onClose={() => setNewFolderOpen(false)} onSubmit={createFolderSubmit} />
      <FolderModal open={!!renameFolderTarget} title="Rename folder" submitLabel="Save" value={renameFolderName} loading={renameFolderMutation.isPending} onChange={setRenameFolderName} onClose={() => setRenameFolderTarget(null)} onSubmit={submitRenameFolder} />
      <DeleteFolderModal folder={deleteFolderTarget} loading={deleteFolderMutation.isPending} onClose={() => setDeleteFolderTarget(null)} onConfirm={() => deleteFolderTarget && deleteFolderMutation.mutate({ id: deleteFolderTarget._id })} />
      <PreviewModal item={preview} onClose={() => setPreview(null)} onCopy={copyUrl} onNext={() => openNextPreview(1)} onPrevious={() => openNextPreview(-1)} hasMultiple={currentFiles.length > 1} />
      <DetailsPanel item={details} onClose={() => setDetails(null)} onCopy={copyUrl} />
      <DeleteModal item={deleteTarget} loading={deleteMutation.isPending} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)} />
      <BulkDeleteModal count={bulkDeleteIds.length} loading={bulkDeleteMutation.isPending} onClose={() => setBulkDeleteIds([])} onConfirm={() => bulkDeleteMutation.mutate(bulkDeleteIds)} permanent={filter === "trash"} />
    </main>
  );
}

function FolderCard({ folder, onOpen, onRename, onDelete }: { folder: FolderItem; onOpen: () => void; onRename: () => void; onDelete: () => void }) {
  return (
    <motion.div layout className="surface group flex min-h-56 flex-col rounded-lg p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-slate-500/70 sm:min-h-64 sm:p-4">
      <button onClick={onOpen} className="grid aspect-4/3 place-items-center rounded-md border border-border/70 bg-white/2.5">
        <Folder className="text-accent" size={42} />
      </button>
      <div className="mt-4 flex items-start justify-between gap-3">
        <button className="min-w-0 text-left" onClick={onOpen}>
          <p className="truncate text-sm font-semibold leading-5 text-white">{folder.name}</p>
          <p className="mt-1 truncate text-xs leading-5 text-muted">{folder.path}</p>
        </button>
        <div className="flex gap-1 opacity-100 transition">
          <button className="grid h-9 w-9 place-items-center rounded text-muted hover:bg-white/5 hover:text-white" onClick={onRename} title="Rename folder"><FileText size={15} /></button>
          <button className="grid h-9 w-9 place-items-center rounded text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={onDelete} title="Delete folder"><Trash2 size={15} /></button>
        </div>
      </div>
    </motion.div>
  );
}

function FileCard({ item, selected, folders, onSelect, onPreview, onDetails, onCopy, onRename, onDelete, onRestore, onMove }: { item: MediaItem; selected: boolean; folders: FolderItem[]; onSelect: () => void; onPreview: () => void; onDetails: () => void; onCopy: () => void; onRename: () => void; onDelete: () => void; onRestore?: () => void; onMove: (folderId: string | null) => void }) {
  return (
    <motion.div layout className={cn("surface group rounded-lg p-3 transition duration-200 hover:-translate-y-0.5 hover:border-slate-500/70", selected && "border-accent ring-1 ring-accent/40")}>
      <div className="relative aspect-4/3 overflow-hidden rounded-md border border-border/70 bg-[#090c13] text-accent">
        {item.mimeType.startsWith("image/") ? <MediaImage id={item._id} alt={item.originalName} /> : <div className="grid h-full place-items-center"><MediaTypeIcon item={item} size={40} /></div>}
        <input aria-label="Select file" type="checkbox" checked={selected} onChange={onSelect} className="absolute left-3 top-3 h-5 w-5 accent-[#5b8cff]" />
        <button className="absolute inset-0" onClick={onPreview} aria-label={`Preview ${item.originalName}`} />
        <div className="absolute inset-x-0 bottom-0 flex translate-y-0 items-center justify-end gap-1 bg-linear-to-t from-black/75 to-transparent p-2 opacity-100 transition duration-200 sm:translate-y-2 sm:p-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <button className="grid h-10 w-10 place-items-center rounded-md bg-black/55 text-white backdrop-blur transition hover:bg-white/15" onClick={onPreview} title="Preview"><Eye size={15} /></button>
          <button className="grid h-10 w-10 place-items-center rounded-md bg-black/55 text-white backdrop-blur transition hover:bg-white/15" onClick={onCopy} title="Copy URL"><Copy size={15} /></button>
          <button className="grid h-10 w-10 place-items-center rounded-md bg-black/55 text-white backdrop-blur transition hover:bg-white/15" onClick={onRename} title="Rename"><FileText size={15} /></button>
          {onRestore && <button className="grid h-10 w-10 place-items-center rounded-md bg-emerald-500/90 text-white backdrop-blur transition hover:bg-emerald-400" onClick={onRestore} title="Restore"><RotateCcw size={15} /></button>}
          <button className="grid h-10 w-10 place-items-center rounded-md bg-red-500/90 text-white backdrop-blur transition hover:bg-red-400" onClick={onDelete} title="Delete"><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-5 text-white">{item.originalName}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{formatBytes(item.size)} - {new Date(item.createdAt).toLocaleDateString()}</p>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-md text-muted transition hover:bg-white/5 hover:text-white" onClick={onDetails} title="Details"><Info size={16} /></button>
      </div>
      <select className="mt-3 h-11 w-full rounded-md border border-border bg-panel px-2 text-sm text-slate-200 outline-none transition focus:border-accent sm:h-9 sm:text-xs" value={item.folderId ?? ""} onChange={(event) => onMove(event.target.value || null)}>
        <option value="">Root</option>
        {folders.map((folder) => <option key={folder._id} value={folder._id}>{folder.name}</option>)}
      </select>
    </motion.div>
  );
}

function FileRow({ item, selected, onSelect, onPreview, onDetails, onCopy, onRename, onRestore, onDelete }: { item: MediaItem; selected: boolean; onSelect: () => void; onPreview: () => void; onDetails: () => void; onCopy: () => void; onRename: () => void; onRestore?: () => void; onDelete: () => void }) {
  return (
    <div className="grid grid-cols-[32px_1fr_auto] gap-3 border-b border-border/70 px-3 py-3 text-sm hover:bg-white/5 md:grid-cols-[36px_1fr_140px_130px_130px_44px] md:items-center md:px-4">
      <input aria-label="Select file" type="checkbox" checked={selected} onChange={onSelect} className="mt-1 h-5 w-5 accent-[#5b8cff] md:mt-0 md:h-4 md:w-4" />
      <button className="flex min-w-0 items-center gap-3 text-left" onClick={onPreview}><MediaTypeIcon item={item} /><span className="truncate font-medium text-white">{item.originalName}</span></button>
      <span className="hidden truncate text-muted md:block">{item.mimeType}</span>
      <span className="hidden text-muted md:block">{formatBytes(item.size)}</span>
      <span className="hidden text-muted md:block">{new Date(item.createdAt).toLocaleDateString()}</span>
      <button className="grid h-10 w-10 place-items-center rounded text-muted hover:bg-white/5 hover:text-white" onClick={onDetails}><MoreHorizontal size={17} /></button>
      <div className="col-span-3 flex flex-wrap gap-2 pl-8 text-xs text-muted md:col-span-6 md:pl-0">
        <span>{formatBytes(item.size)}</span>
        <span>{item.mimeType}</span>
        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="col-span-3 flex flex-wrap gap-2 py-1 pl-8 md:col-span-6 md:py-2 md:pl-0">
        <Button size="sm" variant="secondary" onClick={onCopy}><Copy size={14} /> Copy URL</Button>
        <Button size="sm" variant="secondary" onClick={onRename}><FileText size={14} /> Rename</Button>
        {onRestore && <Button size="sm" variant="secondary" onClick={onRestore}><RotateCcw size={14} /> Restore</Button>}
        <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 size={14} /> Delete</Button>
      </div>
    </div>
  );
}

function UploadMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" }) {
  return (
    <div className={cn("rounded-md border border-border bg-black/20 p-3", tone === "danger" && "border-red-500/30 bg-red-500/10")}>
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold text-white", tone === "danger" && "text-red-200")}>{value}</p>
    </div>
  );
}

function UploadModal({
  open,
  queue,
  onClose,
  onPick,
  onPickFolder,
  onFiles,
  onUpload,
  onCancel,
  onRemove,
  onClearCompleted,
  onStartQueued
}: {
  open: boolean;
  queue: UploadItem[];
  onClose: () => void;
  onPick: () => void;
  onPickFolder: () => void;
  onFiles: (files?: FileList | null) => void;
  onUpload: (item: UploadItem) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  onStartQueued: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const activeUploads = queue.filter((item) => item.status === "uploading" || item.status === "processing").length;
  const completedUploads = queue.filter((item) => item.status === "success" || item.status === "failed" || item.status === "canceled").length;
  const queuedUploads = queue.filter((item) => item.status === "queued").length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ y: 28, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 28, opacity: 0, scale: 0.98 }} className="surface flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-2xl p-4 shadow-2xl sm:rounded-xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Upload files</h2>
                <p className="mt-1 text-xs text-muted">Up to 2 GB per file. {activeUploads ? `${activeUploads} active uploads` : "Uploads start automatically."}</p>
              </div>
              <button className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-white/5 hover:text-white" onClick={onClose}><X size={18} /></button>
            </div>
            <label
              className={cn(
                "mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-[linear-gradient(180deg,rgba(109,141,255,0.08),rgba(255,255,255,0.025))] px-4 text-center transition hover:border-accent/70 hover:bg-accent/10 sm:min-h-48",
                isDragging && "border-accent bg-accent/15 shadow-[0_0_0_1px_rgba(109,141,255,0.25),0_20px_70px_rgba(82,111,255,0.18)]"
              )}
              onDragEnter={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "copy";
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragging(false);
                onFiles(event.dataTransfer.files);
              }}
            >
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-lg border border-accent/20 bg-accent/10 text-accent"><UploadCloud /></span><span className="text-sm font-medium text-white">Drop files or browse</span><span className="mt-1 text-xs text-muted">Images, videos, PDFs, ZIPs and documents</span>
              <input className="sr-only" type="file" multiple onChange={(event) => { onFiles(event.target.files); event.currentTarget.value = ""; }} />
            </label>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                <Button size="sm" variant="secondary" onClick={onPick}><UploadCloud size={14} /> Choose files</Button>
                <Button size="sm" variant="outline" onClick={onPickFolder}><FolderPlus size={14} /> Upload folder</Button>
                {!!queuedUploads && <Button className="col-span-2" size="sm" onClick={onStartQueued}><UploadCloud size={14} /> Start uploads</Button>}
              </div>
              {!!completedUploads && <Button size="sm" variant="ghost" onClick={onClearCompleted}>Clear completed</Button>}
            </div>
            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto thin-scrollbar sm:max-h-80">
              {queue.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-white/[0.035] p-3">
                  <div className="flex items-center gap-3">
                    {item.preview ? <img src={item.preview} className="h-10 w-10 rounded object-cover" alt="" /> : <div className="grid h-10 w-10 place-items-center rounded bg-panel-2 text-xs text-muted">File</div>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{item.file.name}</p>
                      <p className="text-xs text-muted">
                        {uploadStatusLabel(item)} - {formatBytes(item.file.size)}
                        {item.status === "uploading" && item.speed ? ` - ${formatBytes(item.speed)}/s${item.etaSeconds ? ` - ${item.etaSeconds}s left` : ""}` : ""}
                      </p>
                    </div>
                    {item.status === "failed" && <XCircle className="text-red-300" size={18} />}
                    <button className="rounded p-1 text-muted hover:bg-white/5 hover:text-white" onClick={() => onRemove(item.id)}><X size={16} /></button>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded bg-slate-800"><div className="h-full bg-accent transition-all" style={{ width: `${item.progress}%` }} /></div>
                  <div className="mt-3 flex justify-end gap-2">
                    {item.status === "failed" && <LoadingButton size="sm" loading={false} onClick={() => onUpload(item)}><RefreshCw size={14} /> Retry</LoadingButton>}
                    <Button size="sm" variant="ghost" disabled={item.status !== "uploading"} onClick={() => onCancel(item.id)}><Pause size={14} /> Cancel</Button>
                  </div>
                </div>
              ))}
            </div>
            {!queue.length && <div className="mt-4 grid sm:flex sm:justify-end"><Button onClick={onPick}><UploadCloud size={16} /> Choose files</Button></div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function uploadStatusLabel(item: UploadItem) {
  if (item.status === "queued") return "Queued";
  if (item.status === "uploading") return `Uploading ${Math.max(item.progress, 1)}%`;
  if (item.status === "processing") return "Processing";
  if (item.status === "success") return "Uploaded";
  if (item.status === "canceled") return "Canceled";
  return item.error ?? "Failed";
}

function FolderModal({ open, title = "Create folder", submitLabel = "Create", value, loading, onChange, onClose, onSubmit }: { open: boolean; title?: string; submitLabel?: string; value: string; loading: boolean; onChange: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  return (
    <AnimatePresence>
      {open && <motion.div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Card className="w-full max-w-md rounded-t-2xl p-5 sm:rounded-lg">
          <h2 className="font-semibold text-white">{title}</h2>
          <Input className="mt-4" placeholder="Folder name" value={value} onChange={(event) => onChange(event.target.value)} autoFocus />
          <div className="mt-5 grid gap-2 sm:flex sm:justify-end"><Button variant="ghost" onClick={onClose}>Cancel</Button><LoadingButton loading={loading} loadingText="Saving..." onClick={onSubmit}><FolderPlus size={15} /> {submitLabel}</LoadingButton></div>
        </Card>
      </motion.div>}
    </AnimatePresence>
  );
}

function DeleteFolderModal({ folder, loading, onClose, onConfirm }: { folder: FolderItem | null; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {folder && <motion.div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Card className="w-full max-w-md rounded-t-2xl border-red-500/30 p-5 sm:rounded-lg">
          <div className="flex items-center gap-3 text-red-300"><Trash2 /><h2 className="font-semibold">Delete folder?</h2></div>
          <p className="mt-3 text-sm leading-6 text-muted">Only empty folders can be deleted. Files inside this folder will stay untouched unless you delete or move them first.</p>
          <p className="mt-3 truncate rounded bg-[#090c13] p-2 text-sm text-white">{folder.path}</p>
          <div className="mt-5 grid gap-2 sm:flex sm:justify-end"><Button variant="ghost" disabled={loading} onClick={onClose}>Cancel</Button><LoadingButton className="bg-red-500 hover:bg-red-400" loading={loading} loadingText="Deleting..." onClick={onConfirm}><Trash2 size={15} /> Delete folder</LoadingButton></div>
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
      {item && <motion.div className="fixed inset-0 z-50 bg-black/82 p-0 backdrop-blur-xl sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-black/45 px-3 py-3 backdrop-blur-xl sm:gap-3 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{item.originalName}</p>
            <p className="text-xs text-slate-400">{formatBytes(item.size)} - {item.mimeType}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {item.mimeType.startsWith("image/") && <><Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => setZoom((value) => Math.max(value - 0.2, 0.6))}><ZoomOut size={15} /></Button><Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => setZoom((value) => Math.min(value + 0.2, 2.4))}><ZoomIn size={15} /></Button></>}
            <Button className="hidden sm:inline-flex" variant="secondary" size="sm" onClick={() => onCopy(item)}><Copy size={15} /> Copy</Button>
            <Button variant="secondary" size="icon" onClick={() => window.open(resolveMediaUrl(item, "download"), "_blank")} aria-label="Open file"><Download size={15} /></Button>
            <button className="grid h-11 w-11 place-items-center rounded-md bg-white/10 text-white transition hover:bg-white/15" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        {hasMultiple && <button className="absolute bottom-6 left-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/15 sm:bottom-auto sm:left-5 sm:top-1/2" onClick={onPrevious}><ChevronLeft size={20} /></button>}
        {hasMultiple && <button className="absolute bottom-6 right-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/15 sm:bottom-auto sm:right-5 sm:top-1/2" onClick={onNext}><ChevronRight size={20} /></button>}
        <div className="grid h-full place-items-center px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-20 sm:px-0 sm:pb-0 sm:pt-14">
          {item.mimeType.startsWith("image/") ? (
            <div className="max-h-[84vh] max-w-[92vw] overflow-auto thin-scrollbar">
              <img src={resolveMediaUrl(item)} alt={item.originalName} loading="lazy" onError={() => toast.error("Image preview failed")} className="rounded-lg object-contain shadow-2xl transition duration-200" style={{ maxHeight: "84vh", maxWidth: "92vw", transform: `scale(${zoom})` }} />
            </div>
          ) : item.mimeType.startsWith("video/") ? <video src={resolveMediaUrl(item)} controls preload="metadata" className="max-h-[84vh] max-w-[92vw] rounded-lg shadow-2xl" /> : <Card className="p-8 text-center"><File className="mx-auto text-accent" /><p className="mt-4 text-white">{item.originalName}</p><Button className="mt-4" onClick={() => window.open(resolveMediaUrl(item, "download"), "_blank")}><Download size={15} /> Open file</Button></Card>}
        </div>
      </motion.div>}
    </AnimatePresence>
  );
}

function DetailsPanel({ item, onClose, onCopy }: { item: MediaItem | null; onClose: () => void; onCopy: (item: MediaItem) => void }) {
  return (
    <AnimatePresence>
      {item && <motion.aside initial={{ x: 360 }} animate={{ x: 0 }} exit={{ x: 360 }} className="fixed inset-y-0 right-0 z-40 w-full overflow-y-auto border-l border-border bg-panel p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm">
        <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Details</h2><button className="text-muted hover:text-white" onClick={onClose}><X size={18} /></button></div>
        <div className="mt-6 aspect-video overflow-hidden rounded-lg border border-border bg-[#090c13] text-accent">{item.mimeType.startsWith("image/") ? <MediaImage id={item._id} alt={item.originalName} /> : <div className="grid h-full place-items-center"><MediaTypeIcon item={item} size={34} /></div>}</div>
        <div className="mt-5 space-y-3 text-sm">
          {[["Name", item.originalName], ["Size", formatBytes(item.size)], ["Type", item.mimeType], ["Status", item.status], ["Uploaded", new Date(item.createdAt).toLocaleString()], ["Telegram", "Stored"]].map(([label, value]) => (
            <div key={label} className="grid gap-1 border-b border-border pb-2 sm:flex sm:justify-between sm:gap-4"><span className="text-muted">{label}</span><span className="wrap-break-word text-white sm:truncate">{value}</span></div>
          ))}
        </div>
        <Button className="mt-5 w-full" onClick={() => onCopy(item)}><Copy size={15} /> Copy URL</Button>
      </motion.aside>}
    </AnimatePresence>
  );
}

function DeleteModal({ item, loading, onClose, onConfirm }: { item: MediaItem | null; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  const isTrashItem = item?.status === "deleted";
  return (
    <AnimatePresence>
      {item && <motion.div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Card className="w-full max-w-md rounded-t-2xl border-red-500/30 p-5 sm:rounded-lg">
          <div className="flex items-center gap-3 text-red-300"><Trash2 /><h2 className="font-semibold">{isTrashItem ? "Delete forever?" : "Move to trash?"}</h2></div>
          <p className="mt-3 text-sm leading-6 text-muted">{isTrashItem ? "This permanently removes the database record." : "This removes the Telegram message and moves the file record to Trash."}</p>
          <p className="mt-3 truncate rounded bg-[#090c13] p-2 text-sm text-white">{item.originalName}</p>
          <div className="mt-5 grid gap-2 sm:flex sm:justify-end"><Button variant="ghost" disabled={loading} onClick={onClose}>Cancel</Button><LoadingButton className="bg-red-500 hover:bg-red-400" loading={loading} loadingText="Deleting..." onClick={onConfirm}><Trash2 size={15} /> Delete</LoadingButton></div>
        </Card>
      </motion.div>}
    </AnimatePresence>
  );
}

function BulkDeleteModal({ count, loading, permanent, onClose, onConfirm }: { count: number; loading: boolean; permanent: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <AnimatePresence>
      {count > 0 && <motion.div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Card className="w-full max-w-md rounded-t-2xl border-red-500/30 p-5 sm:rounded-lg">
          <div className="flex items-center gap-3 text-red-300"><Trash2 /><h2 className="font-semibold">{permanent ? "Delete selected forever?" : "Delete selected media?"}</h2></div>
          <p className="mt-3 text-sm leading-6 text-muted">
            {permanent ? `This permanently removes ${count} selected file${count > 1 ? "s" : ""} from the project.` : `This removes ${count} selected file${count > 1 ? "s" : ""} from Telegram and moves the record to Trash.`}
          </p>
          <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
            <Button variant="ghost" disabled={loading} onClick={onClose}>Cancel</Button>
            <LoadingButton className="bg-red-500 hover:bg-red-400" loading={loading} loadingText="Deleting..." onClick={onConfirm}><Trash2 size={15} /> Delete {count}</LoadingButton>
          </div>
        </Card>
      </motion.div>}
    </AnimatePresence>
  );
}
