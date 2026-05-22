import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: LucideIcon }) {
  return (
    <Card className="group min-w-0 p-3 sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-white/4.5 text-accent transition group-hover:border-accent/40 group-hover:bg-accent/10 sm:h-10 sm:w-10">
          <Icon size={17} />
        </div>
        <span className="min-w-0 truncate rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300 sm:text-[11px]">{delta}</span>
      </div>
      <p className="mt-4 truncate text-xl font-semibold tracking-tight text-white sm:mt-5 sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">{label}</p>
    </Card>
  );
}
