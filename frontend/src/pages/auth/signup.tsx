import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { notifyError, register as registerUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AuthCard } from "./auth-card";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type FormValues = z.infer<typeof schema>;

export default function Signup() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const session = await registerUser(values.email, values.password);
      setSession(session.token, values.email);
      navigate("/app");
    } catch (error) {
      notifyError(error, "Unable to create account. Please try another email.");
    }
  }

  return (
    <AuthCard title="Create account" subtitle="Connect your own Telegram bot and channel." footer={<><span>Already registered?</span> <Link to="/login" className="text-accent">Login</Link></>}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Input placeholder="Email" disabled={form.formState.isSubmitting} {...form.register("email")} />
        {form.formState.errors.email && <p className="text-xs text-red-300">{form.formState.errors.email.message}</p>}
        <Input placeholder="Password" type="password" disabled={form.formState.isSubmitting} {...form.register("password")} />
        {form.formState.errors.password && <p className="text-xs text-red-300">{form.formState.errors.password.message}</p>}
        <LoadingButton className="w-full" loading={form.formState.isSubmitting} loadingText="Creating account...">Create account</LoadingButton>
      </form>
    </AuthCard>
  );
}
