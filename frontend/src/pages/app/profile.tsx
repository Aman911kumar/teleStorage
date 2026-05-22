import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { KeyRound, Monitor, ShieldCheck, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { changePassword, getAccountSessions, getMe, notifyError, revokeAccountSession, updateProfile } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type ProfileForm = { name: string; email: string };
type PasswordForm = { currentPassword: string; nextPassword: string };

export default function Profile() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const token = useAuthStore((state) => state.token);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
  const sessionsQuery = useQuery({ queryKey: ["sessions"], queryFn: getAccountSessions });
  const profile = useForm<ProfileForm>({ values: { name: meQuery.data?.name ?? "", email: meQuery.data?.email ?? "" } });
  const password = useForm<PasswordForm>();

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      if (token) setSession(token, user);
      toast.success("Profile updated.");
      queryClient.setQueryData(["me"], user);
    },
    onError: (error) => notifyError(error, "Unable to update profile.")
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success("Password changed. Please sign in again.");
      useAuthStore.getState().logout();
      location.href = "/login";
    },
    onError: (error) => notifyError(error, "Unable to change password.")
  });

  const revokeMutation = useMutation({
    mutationFn: revokeAccountSession,
    onSuccess: async () => {
      toast.success("Session revoked.");
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => notifyError(error, "Unable to revoke session.")
  });

  return (
    <PageShell eyebrow="Account" title="Profile and security" description="Manage account identity, password security, and active sessions.">
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white"><UserRound size={17} className="text-accent" /> Profile</div>
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={profile.handleSubmit((values) => profileMutation.mutate(values))}>
              <label className="space-y-1.5">
                <span className="text-xs text-muted">Name</span>
                <Input {...profile.register("name")} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-muted">Email</span>
                <Input type="email" {...profile.register("email")} />
              </label>
              <LoadingButton loading={profileMutation.isPending} loadingText="Saving..." className="md:col-span-2 w-fit">Save profile</LoadingButton>
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-white"><KeyRound size={17} className="text-accent" /> Password</div>
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={password.handleSubmit((values) => passwordMutation.mutate(values))}>
              <label className="space-y-1.5">
                <span className="text-xs text-muted">Current password</span>
                <Input type="password" {...password.register("currentPassword", { required: true })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-muted">New password</span>
                <Input type="password" {...password.register("nextPassword", { required: true })} />
              </label>
              <LoadingButton loading={passwordMutation.isPending} loadingText="Updating..." variant="secondary" className="md:col-span-2 w-fit">Change password</LoadingButton>
            </form>
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-white"><ShieldCheck size={17} className="text-accent" /> Active sessions</div>
          <div className="mt-4 space-y-3">
            {(sessionsQuery.data ?? []).map((session) => (
              <div key={session.id} className="rounded-md border border-border bg-white/[0.025] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-white"><Monitor size={15} /> <span className="truncate">{session.userAgent}</span></div>
                    <p className="mt-1 text-xs text-muted">{session.ip} - Last used {new Date(session.lastUsedAt).toLocaleString()}</p>
                  </div>
                  <Button variant="secondary" size="sm" disabled={session.revoked || revokeMutation.isPending} onClick={() => revokeMutation.mutate(session.id)}>
                    {session.revoked ? "Revoked" : "Revoke"}
                  </Button>
                </div>
              </div>
            ))}
            {!sessionsQuery.data?.length && <p className="text-sm text-muted">No sessions found.</p>}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
