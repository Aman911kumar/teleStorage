import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { refreshSession } from "@/lib/api";
import { PageLoading } from "@/components/page-loading";
import { useAuthStore } from "@/store/auth-store";

export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);
  const [refreshAttempted, setRefreshAttempted] = useState(Boolean(token));

  useEffect(() => {
    let active = true;
    if (token || refreshAttempted) {
      return;
    }
    refreshSession()
      .then(({ data }) => {
        if (active) setSession(data.data.token, data.data.user);
      })
      .catch(() => {
        if (active) logout();
      })
      .finally(() => {
        if (active) setRefreshAttempted(true);
      });
    return () => {
      active = false;
    };
  }, [logout, refreshAttempted, setSession, token]);

  if (!token && !refreshAttempted) return <PageLoading cards={4} />;
  return token || useAuthStore.getState().token ? <Outlet /> : <Navigate to="/login" replace />;
}

export function AuthRoute() {
  const token = useAuthStore((state) => state.token);
  const setSession = useAuthStore((state) => state.setSession);
  const [refreshAttempted, setRefreshAttempted] = useState(Boolean(token));

  useEffect(() => {
    let active = true;
    if (token || refreshAttempted) return;

    refreshSession()
      .then(({ data }) => {
        if (active) setSession(data.data.token, data.data.user);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setRefreshAttempted(true);
      });

    return () => {
      active = false;
    };
  }, [refreshAttempted, setSession, token]);

  if (!token && !refreshAttempted) return <PageLoading cards={4} />;
  return token || useAuthStore.getState().token ? <Navigate to="/app" replace /> : <Outlet />;
}
