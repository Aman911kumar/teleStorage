import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { forgotPassword, notifyError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AuthCard } from "./auth-card";

const schema = z.object({ email: z.string().email("Enter a valid email address.") });
type FormValues = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [devToken, setDevToken] = useState("");
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const result = await forgotPassword(values.email);
      setDevToken(result.resetToken ?? "");
      toast.success("If an account exists, reset instructions are ready.");
    } catch (error) {
      notifyError(error, "Unable to start password reset.");
    }
  }

  return (
    <AuthCard title="Reset password" subtitle="Enter your email and we will create a short-lived reset token for your account." footer={<Link to="/login" className="text-accent">Back to login</Link>}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Email address</span>
          <Input placeholder="you@company.com" disabled={form.formState.isSubmitting} {...form.register("email")} />
          {form.formState.errors.email && <p className="text-xs text-red-300">{form.formState.errors.email.message}</p>}
        </label>
        <LoadingButton className="w-full" loading={form.formState.isSubmitting} loadingText="Sending...">Send reset instructions</LoadingButton>
      </form>
      {devToken && (
        <div className="mt-5 rounded-md border border-border bg-[#090c13] p-3 text-xs text-muted">
          Dev reset link: <Link className="break-all text-accent" to={`/reset-password?token=${devToken}`}>/reset-password?token={devToken}</Link>
        </div>
      )}
    </AuthCard>
  );
}
