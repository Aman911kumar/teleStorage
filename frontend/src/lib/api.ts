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
  telegramChannelId: string;
  telegramBotUsername: string;
  telegramBotTokenMasked: string;
  telegramChannelTitle?: string;
  storageUsed: number;
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

export async function uploadMedia(file: File, workspaceId?: string, onProgress?: (value: number) => void, signal?: AbortSignal) {
  const form = new FormData();
  form.append("file", file);
  if (workspaceId) form.append("workspaceId", workspaceId);
  const { data } = await api.post("/api/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    signal,
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
    }
  });
  return data.data as { id: string; url: string; signedUrl: string; duplicate: boolean };
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

export async function validateWorkspace(input: { telegramBotToken: string; telegramChannelId: string }) {
  const { data } = await api.post("/api/workspaces/validate", input);
  return data.data as {
    botUsername: string;
    channelId: string;
    channelTitle?: string;
    permissions: { status: string; canPostMessages: boolean; canDeleteMessages: boolean };
  };
}

export async function getMedia() {
  const { data } = await api.get("/api/media");
  return data.data as MediaItem[];
}

export async function deleteMedia(id: string) {
  await api.delete(`/api/media/${id}`);
}
