export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return window.location.origin;
}

export function withApiBase(path: string, baseUrl = getApiBaseUrl()) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
