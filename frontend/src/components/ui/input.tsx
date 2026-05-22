import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-11 w-full rounded-md border border-border bg-white/[0.035] px-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] placeholder:text-slate-500 transition duration-200 hover:border-slate-600 focus:border-accent disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
