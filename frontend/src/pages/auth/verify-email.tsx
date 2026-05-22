import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { notifyError, verifyEmail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AuthCard } from "./auth-card";

const schema = z.object({ token: z.string().min(16, "Verification token is required.") });
type FormValues = z.infer<typeof schema>;

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { token: params.get("token") ?? "" } });

  async function onSubmit(values: FormValues) {
    try {
      await verifyEmail(values.token);
      toast.success("Email verified.");
    } catch (error) {
      notifyError(error, "Unable to verify email.");
    }
  }

  return (
    <AuthCard title="Verify email" subtitle="Confirm your email address to keep your account recovery and security notices reliable." footer={<Link to="/app/profile" className="text-accent">Go to account settings</Link>}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Verification token</span>
          <Input disabled={form.formState.isSubmitting} {...form.register("token")} />
          {form.formState.errors.token && <p className="text-xs text-red-300">{form.formState.errors.token.message}</p>}
        </label>
        <LoadingButton className="w-full" loading={form.formState.isSubmitting} loadingText="Verifying...">Verify email</LoadingButton>
      </form>
    </AuthCard>
  );
}
