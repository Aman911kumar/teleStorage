import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, GitBranch, Mail } from "lucide-react";
import { login, notifyError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { AuthCard } from "./auth-card";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  remember: z.boolean().optional()
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { remember: true }
  });

  async function onSubmit(values: FormValues) {
    try {
      const session = await login(values.email, values.password, values.remember ?? true);
      setSession(session.token, session.user);
      navigate("/app");
    } catch (error) {
      notifyError(error, "Incorrect email or password.");
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in with a protected session and continue managing your Telegram-backed media cloud." footer={<><Link to="/forgot-password" className="text-accent">Forgot password?</Link><span className="mx-2">-</span><Link to="/signup" className="text-accent">Create account</Link></>}>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="secondary" disabled><GitBranch size={16} /> GitHub</Button>
        <Button type="button" variant="secondary" disabled><Mail size={16} /> Google</Button>
      </div>
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-muted"><span className="h-px flex-1 bg-border" /> Email <span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Email</span>
          <Input placeholder="you@company.com" disabled={isSubmitting} {...register("email")} />
          {errors.email && <p className="text-xs text-red-300">{errors.email.message}</p>}
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Password</span>
          <div className="relative">
            <Input placeholder="Enter password" type={showPassword ? "text" : "password"} className="pr-10" disabled={isSubmitting} {...register("password")} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-300">{errors.password.message}</p>}
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="h-4 w-4 accent-[#627bff]" {...register("remember")} />
          Remember this device
        </label>
        <LoadingButton className="w-full" loading={isSubmitting} loadingText="Signing in...">Sign in securely</LoadingButton>
      </form>
    </AuthCard>
  );
}
