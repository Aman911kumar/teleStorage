import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: LucideIcon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="rounded-md border border-border bg-panel-2 p-2 text-accent">
          <Icon size={18} />
        </div>
        <span className="text-xs text-emerald-300">{delta}</span>
      </div>
      <p className="mt-5 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </Card>
  );
}
