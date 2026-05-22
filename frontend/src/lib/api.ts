import axios from "axios";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth-store";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  withCredentials: true,
  timeout: 30_000
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      useAuthStore.getState().logout();
    }
    error.friendlyMessage = getApiErrorMessage(error);
    return Promise.reject(error);
  }
);

export async function requestWithToast<T>(
  request: Promise<T>,
  messages?: { loading?: string; success?: string; error?: string }
) {
  if (!messages) return request;
  return toast.promise(request, {
    loading: messages.loading ?? "Working...",
    success: messages.success ?? "Done",
    error: (error) => messages.error ?? getApiErrorMessage(error)
  });
}

export function notifyError(error: unknown, fallback?: string) {
  toast.error(getApiErrorMessage(error, fallback));
}

export function notifyInfo(message: string) {
  toast(message, { icon: "i" });
}

export function notifyWarning(message: string) {
  toast(message, { icon: "!" });
}

export async function login(email: string, password: string) {
  const { data } = await api.post("/api/auth/login", { email, password });
  return data.data as { token: string };
}

export async function register(email: string, password: string) {
  const { data } = await api.post("/api/auth/register", { email, password });
  return data.data as { token: string };
}

export type Workspace = {
  _id: string;
  name: string;
  slug: string;
  publicProjectId: string;
  uploadToken?: string;
  telegramChannelId: string;
  telegramBotUsername: string;
  telegramBotTokenMasked: string;
  telegramChannelTitle?: string;
  storageUsed: number;
  storageLimitBytes: number;
  bandwidthUsed: number;
  uploadCount: number;
  imageCount: number;
  videoCount: number;
  compressionSavings: number;
  isActive: boolean;
  health?: { status: "healthy" | "warning" | "failed"; checkedAt?: string; message?: string };
  createdAt: string;
};

export type MediaItem = {
  _id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  visibility: "public" | "private";
  status: string;
  createdAt: string;
  folderId?: string;
  tags?: string[];
  mediaType?: string;
  metadata?: { width?: number; height?: number; duration?: number; format?: string };
  viewUrl?: string;
  thumbUrl?: string;
  downloadUrl?: string;
};

export type FolderItem = {
  _id: string;
  workspaceId: string;
  parentId?: string;
  name: string;
  path: string;
  createdAt: string;
};

export type ApiKey = {
  _id: string;
  workspaceId: string;
  name: string;
  publicKey: string;
  publicKeyMasked: string;
  scopes: string[];
  status: "active" | "revoked";
  lastUsedAt?: string;
  createdAt: string;
  secret?: string;
};

export type ApiRequestLog = {
  _id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  success?: boolean;
  errorCode?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};

export type Analytics = {
  storageUsed: number;
  totalFiles: number;
  uploadRequests: number;
  bandwidthUsed: number;
  apiRequests: number;
  compressionSavings: number;
  imageCount: number;
  videoCount: number;
  workspaces: Workspace[];
  recentUploads: MediaItem[];
  fileTypes: Array<{ _id: string; count: number; bytes: number }>;
  activity: unknown[];
};

export async function uploadMedia(file: File, workspaceId?: string, onProgress?: (value: number, loaded?: number, total?: number) => void, signal?: AbortSignal, options?: { folderId?: string; tags?: string[]; visibility?: "public" | "private"; metadata?: Record<string, string> }) {
  const form = new FormData();
  form.append("file", file);
  if (workspaceId) form.append("workspaceId", workspaceId);
  if (options?.folderId) form.append("folderId", options.folderId);
  if (options?.visibility) form.append("visibility", options.visibility);
  if (options?.tags?.length) form.append("tags", JSON.stringify(options.tags));
  if (options?.metadata) form.append("metadata", JSON.stringify(options.metadata));
  const { data } = await api.post("/api/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 0,
    signal,
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100), event.loaded, event.total);
    }
  });
  return data.data as { id: string; url: string; signedUrl: string; viewUrl: string; thumbUrl: string; downloadUrl: string; duplicate: boolean };
}

export async function getAnalytics() {
  const { data } = await api.get("/api/analytics");
  return data.data as Analytics;
}

export async function getWorkspaces() {
  const { data } = await api.get("/api/workspaces");
  return data.data as Workspace[];
}

export async function createWorkspace(input: { name: string; telegramBotToken: string; telegramChannelId: string }) {
  const { data } = await api.post("/api/workspaces", input);
  return data.data as Workspace;
}

export async function updateWorkspace(id: string, input: { name?: string; telegramBotToken?: string; telegramChannelId?: string }) {
  const { data } = await api.patch(`/api/workspaces/${id}`, input);
  return data.data as Workspace;
}

export async function deleteWorkspace(id: string) {
  await api.delete(`/api/workspaces/${id}`);
}

export async function syncWorkspace(id: string) {
  const { data } = await api.post(`/api/workspaces/${id}/sync`);
  return data.data as { checked: number; removed: number; removedIds: string[] };
}

export async function rotateWorkspaceUploadToken(id: string) {
  const { data } = await api.post(`/api/workspaces/${id}/upload-token/rotate`);
  return data.data as Workspace & { uploadToken: string };
}

export async function validateWorkspace(input: { telegramBotToken: string; telegramChannelId: string }) {
  const { data } = await api.post("/api/workspaces/validate", input);
  return data.data as {
    botUsername: string;
    channelId: string;
    channelTitle?: string;
    permissions: { status: string; canPostMessages: boolean; canDeleteMessages: boolean };
  };
}

export async function getMedia(options?: { includeDeleted?: boolean }) {
  const { data } = await api.get("/api/media", { params: { includeDeleted: options?.includeDeleted || undefined } });
  return data.data as MediaItem[];
}

export async function updateMedia(id: string, input: { folderId?: string | null; originalName?: string }) {
  const { data } = await api.patch(`/api/media/${id}`, input);
  return data.data as MediaItem;
}

export async function deleteMedia(id: string) {
  await api.delete(`/api/media/${id}`);
}

export async function getFolders(workspaceId: string, parentId?: string) {
  const { data } = await api.get("/api/folders", { params: { workspaceId, parentId } });
  return data.data as FolderItem[];
}

export async function createFolder(input: { workspaceId: string; name: string; parentId?: string }) {
  const { data } = await api.post("/api/folders", input);
  return data.data as FolderItem;
}

export async function ensureFolderPath(input: { workspaceId: string; path: string; parentId?: string }) {
  const { data } = await api.post("/api/folders/ensure", input);
  return data.data as FolderItem;
}

export async function renameFolder(id: string, input: { workspaceId: string; name: string }) {
  const { data } = await api.patch(`/api/folders/${id}`, input);
  return data.data as FolderItem;
}

export async function deleteFolder(id: string, workspaceId: string) {
  await api.delete(`/api/folders/${id}`, { params: { workspaceId } });
}

export async function getApiKeys(workspaceId?: string) {
  const { data } = await api.get("/api/api-keys", { params: { workspaceId } });
  return data.data as ApiKey[];
}

export async function createApiKey(input: { workspaceId: string; name: string; scopes: string[] }) {
  const { data } = await api.post("/api/api-keys", input);
  return data.data as ApiKey & { secret: string };
}

export async function regenerateApiKey(id: string) {
  const { data } = await api.post(`/api/api-keys/${id}/regenerate`);
  return data.data as ApiKey & { secret: string };
}

export async function revokeApiKey(id: string) {
  const { data } = await api.delete(`/api/api-keys/${id}`);
  return data.data as ApiKey;
}

export async function getApiRequestLogs(workspaceId?: string) {
  const { data } = await api.get("/api/api-request-logs", { params: { workspaceId } });
  return data.data as ApiRequestLog[];
}
