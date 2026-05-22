import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { notifyError, register as registerUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AuthCard } from "./auth-card";

const schema = z.object({
  name: z.string().min(2, "Enter your full name."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").regex(/[A-Z]/, "Add an uppercase letter.").regex(/[a-z]/, "Add a lowercase letter.").regex(/\d/, "Add a number."),
  confirmPassword: z.string(),
  terms: z.boolean().refine(Boolean, "Accept the terms to continue.")
}).refine((values) => values.password === values.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
type FormValues = z.infer<typeof schema>;

function strength(password = "") {
  return [password.length >= 8, /[A-Z]/.test(password), /[a-z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
}

export default function Signup() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { terms: false } });
  const password = useWatch({ control: form.control, name: "password" });
  const score = useMemo(() => strength(password), [password]);

  async function onSubmit(values: FormValues) {
    try {
      const session = await registerUser({ name: values.name, email: values.email, password: values.password });
      setSession(session.token, session.user);
      if (session.verificationToken) toast.success("Account created. Dev verification token generated.");
      navigate("/app");
    } catch (error) {
      notifyError(error, "Unable to create account. Please try another email.");
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Start with secure sessions, protected uploads, and a workspace ready for your Telegram storage." footer={<><span>Already registered?</span> <Link to="/login" className="text-accent">Login</Link></>}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Full name</span>
          <Input placeholder="Aman Kumar" disabled={form.formState.isSubmitting} {...form.register("name")} />
          {form.formState.errors.name && <p className="text-xs text-red-300">{form.formState.errors.name.message}</p>}
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Email</span>
          <Input placeholder="you@company.com" disabled={form.formState.isSubmitting} {...form.register("email")} />
          {form.formState.errors.email && <p className="text-xs text-red-300">{form.formState.errors.email.message}</p>}
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Password</span>
          <div className="relative">
            <Input type={showPassword ? "text" : "password"} className="pr-10" disabled={form.formState.isSubmitting} {...form.register("password")} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 5 }).map((_, index) => <span key={index} className={`h-1 rounded-full ${index < score ? "bg-accent" : "bg-white/10"}`} />)}
          </div>
          {form.formState.errors.password && <p className="text-xs text-red-300">{form.formState.errors.password.message}</p>}
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Confirm password</span>
          <Input type="password" disabled={form.formState.isSubmitting} {...form.register("confirmPassword")} />
          {form.formState.errors.confirmPassword && <p className="text-xs text-red-300">{form.formState.errors.confirmPassword.message}</p>}
        </label>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#627bff]" {...form.register("terms")} />
          <span>I agree to the Terms and Privacy Policy.</span>
        </label>
        {form.formState.errors.terms && <p className="text-xs text-red-300">{form.formState.errors.terms.message}</p>}
        <LoadingButton className="w-full" loading={form.formState.isSubmitting} loadingText="Creating account...">Create account</LoadingButton>
      </form>
    </AuthCard>
  );
}
