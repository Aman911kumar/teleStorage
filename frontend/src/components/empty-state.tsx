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
    <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-700 bg-panel p-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-border bg-panel-2 text-accent"><Icon size={22} /></div>
        <h3 className="mt-4 font-semibold text-white">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{text}</p>
        {action && <Button className="mt-5" onClick={onAction}>{action}</Button>}
      </div>
    </div>
  );
}
