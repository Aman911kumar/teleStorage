import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: LucideIcon }) {
  return (
    <Card className="group p-5">
      <div className="flex items-center justify-between">
        <div className="rounded-md border border-border bg-white/4.5 p-2.5 text-accent transition group-hover:border-accent/40 group-hover:bg-accent/10">
          <Icon size={18} />
        </div>
        <span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300">{delta}</span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm leading-5 text-muted">{label}</p>
    </Card>
  );
}
