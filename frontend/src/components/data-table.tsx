import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Row = Record<string, string | number>;

export function DataTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(Object.keys(rows[0] ?? {})[0]);
  const filtered = useMemo(
    () =>
      rows
        .filter((row) => Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey]))),
    [query, rows, sortKey]
  );
  const keys = Object.keys(rows[0] ?? {});

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white/2.5">
      <div className="flex items-center gap-2 border-b border-border bg-white/2.5 p-3">
        <Search size={16} className="text-muted" />
        <Input className="h-11 border-0 bg-transparent text-base sm:h-9 sm:text-sm" placeholder="Search table" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="space-y-2 p-3 sm:hidden">
        {filtered.map((row, index) => (
          <div key={index} className="rounded-md border border-border bg-[#090c13] p-3">
            {keys.map((key) => (
              <div key={key} className="flex items-start justify-between gap-3 py-1.5 text-sm">
                <span className="capitalize text-muted">{key}</span>
                <span className="max-w-[62%] break-words text-right text-slate-200">{row[key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="thin-scrollbar hidden max-h-105 overflow-auto sm:block">
        <table className="w-full min-w-155 text-left text-sm">
          <thead className="sticky top-0 bg-[#111722] text-xs uppercase tracking-wide text-muted">
            <tr>
              {keys.map((key) => (
                <th key={key} className="px-4 py-3">
                  <button className={cn("capitalize hover:text-white", sortKey === key && "text-white")} onClick={() => setSortKey(key)}>
                    {key}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={index} className="border-t border-border/70 transition hover:bg-white/4.5">
                {keys.map((key) => (
                  <td key={key} className="px-4 py-3 text-slate-200">
                    {row[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
