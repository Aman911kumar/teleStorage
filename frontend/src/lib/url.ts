export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");
  if (configured) {
    try {
      const url = new URL(configured);
      if (import.meta.env.DEV && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
        url.protocol = "http:";
        return url.toString().replace(/\/+$/, "");
      }
    } catch {
      return configured;
    }
    return configured;
  }
  return window.location.origin;
}

export function withApiBase(path: string, baseUrl = getApiBaseUrl()) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
