import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring group inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-center text-sm font-medium leading-none tracking-[0.01em] transition duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:scale-100 disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.9]",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(180deg,#7b96ff,#526fff)] text-white shadow-[0_10px_28px_rgba(82,111,255,0.28),inset_0_1px_0_rgba(255,255,255,0.22)] hover:brightness-110",
        secondary:
          "border border-border bg-white/[0.045] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-slate-500/70 hover:bg-white/[0.075]",
        outline:
          "border border-border bg-transparent text-slate-100 hover:border-slate-500/70 hover:bg-white/[0.045]",
        ghost:
          "text-muted hover:bg-white/[0.055] hover:text-white",
        destructive:
          "bg-[linear-gradient(180deg,#ef5b66,#dc2626)] text-white shadow-[0_10px_26px_rgba(220,38,38,0.24),inset_0_1px_0_rgba(255,255,255,0.18)] hover:brightness-110"
      },
      size: {
        icon: "h-9 w-9 px-0",
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
