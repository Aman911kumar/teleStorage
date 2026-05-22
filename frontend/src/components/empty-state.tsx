import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  onAction
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="surface-muted grid min-h-64 place-items-center rounded-lg border-dashed p-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-border bg-accent/10 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"><Icon size={22} /></div>
        <h3 className="mt-4 font-semibold tracking-tight text-white">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{text}</p>
        {action && <Button className="mt-5" onClick={onAction}>{action}</Button>}
      </div>
    </div>
  );
}
