import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-11 w-full rounded-md border border-border bg-[#0a0d13] px-3 text-sm text-white placeholder:text-slate-500 transition focus:border-accent",
        className
      )}
      {...props}
    />
  );
}
