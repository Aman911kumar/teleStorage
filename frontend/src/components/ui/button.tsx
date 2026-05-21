import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition duration-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white shadow-[0_10px_30px_rgba(91,140,255,0.22)] hover:bg-blue-400",
        secondary: "border border-border bg-panel-2 text-white hover:border-slate-600 hover:bg-slate-800",
        ghost: "text-muted hover:bg-white/5 hover:text-white",
        destructive: "bg-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.2)] hover:bg-red-400"
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-5"
      }
    },
    defaultVariants: { variant: "primary", size: "md" }
  }
);

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
