import { cn } from "@/lib/utils";

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-panel p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn("rounded px-3 py-1.5 text-sm text-muted transition", active === tab && "bg-panel-2 text-white shadow-sm")}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
