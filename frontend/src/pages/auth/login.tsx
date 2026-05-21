import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login, notifyError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AuthCard } from "./auth-card";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const session = await login(values.email, values.password);
      setSession(session.token, values.email);
      navigate("/app");
    } catch (error) {
      notifyError(error, "Unable to sign in. Please check your credentials.");
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to manage Telegram workspaces, uploads and media." footer={<><Link to="/forgot-password" className="text-accent">Forgot password?</Link><span className="mx-2">-</span><Link to="/signup" className="text-accent">Create account</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input placeholder="Email" disabled={isSubmitting} {...register("email")} />
        {errors.email && <p className="text-xs text-red-300">{errors.email.message}</p>}
        <Input placeholder="Password" type="password" disabled={isSubmitting} {...register("password")} />
        {errors.password && <p className="text-xs text-red-300">{errors.password.message}</p>}
        <LoadingButton className="w-full" loading={isSubmitting} loadingText="Signing in...">Sign in</LoadingButton>
        <LoadingButton className="w-full" variant="secondary" type="button" disabled>Continue with Google</LoadingButton>
      </form>
    </AuthCard>
  );
}
