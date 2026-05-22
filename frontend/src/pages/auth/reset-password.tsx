import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { notifyError, resetPassword } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AuthCard } from "./auth-card";

const schema = z.object({
  token: z.string().min(16, "Reset token is required."),
  password: z.string().min(8, "Use at least 8 characters.").regex(/[A-Z]/, "Add an uppercase letter.").regex(/[a-z]/, "Add a lowercase letter.").regex(/\d/, "Add a number.")
});
type FormValues = z.infer<typeof schema>;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { token: params.get("token") ?? "" } });

  async function onSubmit(values: FormValues) {
    try {
      await resetPassword(values.token, values.password);
      toast.success("Password updated. Please sign in again.");
      navigate("/login");
    } catch (error) {
      notifyError(error, "Unable to reset password.");
    }
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Reset tokens expire quickly and all existing sessions are revoked after a successful change." footer={<Link to="/login" className="text-accent">Back to login</Link>}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Reset token</span>
          <Input disabled={form.formState.isSubmitting} {...form.register("token")} />
          {form.formState.errors.token && <p className="text-xs text-red-300">{form.formState.errors.token.message}</p>}
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">New password</span>
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} className="pr-10" disabled={form.formState.isSubmitting} {...form.register("password")} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.formState.errors.password && <p className="text-xs text-red-300">{form.formState.errors.password.message}</p>}
        </label>
        <LoadingButton className="w-full" loading={form.formState.isSubmitting} loadingText="Updating...">Update password</LoadingButton>
      </form>
    </AuthCard>
  );
}
