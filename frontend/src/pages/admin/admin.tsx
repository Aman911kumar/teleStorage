import { useQuery } from "@tanstack/react-query";
import { Database, FileWarning, HardDrive } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { getAnalytics } from "@/lib/api";
import { formatBytes } from "@/lib/format";

export default function Admin() {
  const { data } = useQuery({ queryKey: ["analytics"], queryFn: getAnalytics });
  const rows = data?.workspaces.map((workspace) => ({ workspace: workspace.name, storage: formatBytes(workspace.storageUsed), uploads: workspace.uploadCount })) ?? [];
  return (
    <PageShell eyebrow="Admin" title="Platform overview" description="Storage usage, failed uploads, moderation queues and workspace-level controls.">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><HardDrive className="text-accent" /><p className="mt-5 text-2xl font-semibold text-white">{formatBytes(data?.storageUsed)}</p><p className="text-sm text-muted">Total storage</p></Card>
        <Card className="p-5"><Database className="text-accent" /><p className="mt-5 text-2xl font-semibold text-white">{data?.workspaces.length ?? 0}</p><p className="text-sm text-muted">Workspaces</p></Card>
        <Card className="p-5"><FileWarning className="text-accent" /><p className="mt-5 text-2xl font-semibold text-white">0</p><p className="text-sm text-muted">Failed uploads</p></Card>
      </div>
      <Card className="mt-5 p-5"><h2 className="mb-4 font-semibold text-white">Workspace usage</h2><DataTable rows={rows.length ? rows : [{ workspace: "No workspaces", storage: "0 B", uploads: 0 }]} /></Card>
    </PageShell>
  );
}
