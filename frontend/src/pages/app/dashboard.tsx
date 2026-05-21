import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, FileImage, FileUp, FileVideo, HardDrive, Radio } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { getAnalytics } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { PageLoading } from "@/components/page-loading";

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["analytics"], queryFn: getAnalytics });
  const rows = data?.recentUploads.map((item) => ({
    name: item.originalName,
    type: item.mimeType,
    size: formatBytes(item.size),
    status: item.status
  })) ?? [];

  return (
    <PageShell eyebrow="Overview" title="Storage dashboard" description="Monitor storage, uploads, Telegram health and delivery activity across your workspaces.">
      {isLoading ? <PageLoading cards={4} /> : isError ? <EmptyState icon={BarChart3} title="Unable to load dashboard" text="Analytics could not be fetched. Check the backend and try again." action="Retry" onAction={() => refetch()} /> : (
      <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Storage used" value={formatBytes(data?.storageUsed)} delta={isLoading ? "Loading" : "Live"} icon={HardDrive} />
        <StatCard label="Total uploads" value={String(data?.totalFiles ?? 0)} delta="Indexed" icon={FileUp} />
        <StatCard label="Images stored" value={String(data?.imageCount ?? 0)} delta="Optimized" icon={FileImage} />
        <StatCard label="Videos stored" value={String(data?.videoCount ?? 0)} delta="Streamable" icon={FileVideo} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Upload requests" value={String(data?.uploadRequests ?? 0)} delta="API" icon={FileUp} />
        <StatCard label="Bandwidth" value={formatBytes(data?.bandwidthUsed)} delta="Delivery" icon={Radio} />
        <StatCard label="Workspace health" value={data?.workspaces?.some((w) => w.health?.status === "failed") ? "Check" : "Healthy"} delta="Telegram" icon={CheckCircle2} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-white">Recent uploads</h2>
          {rows.length ? <DataTable rows={rows} /> : <EmptyState icon={FileUp} title="No uploads yet" text="Upload your first image, video or file from the media library or API." action="Upload media" />}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white"><BarChart3 size={18} /> File types</h2>
          {data?.fileTypes.length ? (
            <div className="space-y-3">
              {data.fileTypes.map((type) => <div key={type._id} className="flex items-center justify-between rounded-md bg-panel-2 p-3 text-sm"><span className="text-white">{type._id}</span><span className="text-muted">{formatBytes(type.bytes)}</span></div>)}
            </div>
          ) : <EmptyState icon={BarChart3} title="No analytics yet" text="Analytics appear as soon as uploads are stored and delivered." />}
        </Card>
      </div>
      </>
      )}
    </PageShell>
  );
}
