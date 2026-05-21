import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { getAnalytics } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { PageLoading } from "@/components/page-loading";

export default function Analytics() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["analytics"], queryFn: getAnalytics });
  const rows = data?.fileTypes.map((item) => ({ type: item._id, files: item.count, storage: formatBytes(item.bytes) })) ?? [];
  return (
    <PageShell eyebrow="Analytics" title="Usage analytics" description="Track uploads over time, storage growth, bandwidth, API requests and file type mix.">
      {isLoading ? <PageLoading cards={3} /> : isError ? <EmptyState icon={BarChart3} title="Unable to load analytics" text="Usage data is unavailable right now. Retry when the backend is reachable." action="Retry" onAction={() => refetch()} /> : (
      <>
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-muted">Compression savings</p><p className="mt-2 text-2xl font-semibold text-white">{formatBytes(data?.compressionSavings)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Images</p><p className="mt-2 text-2xl font-semibold text-white">{data?.imageCount ?? 0}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Videos</p><p className="mt-2 text-2xl font-semibold text-white">{data?.videoCount ?? 0}</p></Card>
      </div>
      <Card className="p-5">
        {rows.length ? <DataTable rows={rows} /> : <EmptyState icon={BarChart3} title="No usage data yet" text="Upload activity and delivery analytics appear here once your workspace has files." />}
      </Card>
      </>
      )}
    </PageShell>
  );
}
