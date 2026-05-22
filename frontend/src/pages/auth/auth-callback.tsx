import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { notifyError, refreshSession } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { AuthCard } from "./auth-card";

export default function AuthCallback() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    let active = true;
    refreshSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.data.token, data.data.user);
        toast.success("Signed in with Google.");
        navigate("/app", { replace: true });
      })
      .catch((error) => {
        if (!active) return;
        notifyError(error, "Google login failed.");
        navigate("/login", { replace: true });
      });
    return () => {
      active = false;
    };
  }, [navigate, setSession]);

  return (
    <AuthCard title="Completing sign in" subtitle="Google verified your account. Securing your TeleStore session now." footer="You will be redirected automatically.">
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
      </div>
    </AuthCard>
  );
}
