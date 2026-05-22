import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-white/[0.055] before:absolute before:inset-0 before:animate-shimmer before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.08),transparent)] before:bg-[length:220%_100%]",
        className
      )}
    />
  );
}
