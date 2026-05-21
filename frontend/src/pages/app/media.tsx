import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, File, Grid2X2, List, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { MediaUploader } from "@/components/media-uploader";
import { deleteMedia, getMedia, notifyError } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { PageLoading } from "@/components/page-loading";
import { LoadingButton } from "@/components/ui/loading-button";

export default function Media() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["media"], queryFn: getMedia });
  const deleteMutation = useMutation({
    mutationFn: deleteMedia,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["media"] });
      const previous = queryClient.getQueryData(["media"]);
      queryClient.setQueryData(["media"], data.filter((item) => item._id !== id));
      return { previous };
    },
    onSuccess: () => {
      toast.success("Media deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["media"], context.previous);
      notifyError(error, "Unable to delete media. Please try again.");
    }
  });

  return (
    <PageShell eyebrow="Media library" title="Manage files" description="Search, preview, upload, copy URLs and organize images, videos, PDFs and files.">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <MediaUploader />
        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 text-muted" size={16} /><Input className="pl-9" placeholder="Search media" disabled={isLoading} /></div>
            <div className="flex gap-2"><Button variant="secondary" size="sm" disabled={isLoading}><Grid2X2 size={15} /></Button><Button variant="secondary" size="sm" disabled={isLoading}><List size={15} /></Button></div>
          </div>
          {isLoading ? <PageLoading cards={3} /> : isError ? (
            <EmptyState icon={File} title="Unable to load media" text="The media library could not be loaded. Check your backend and try again." action="Retry" onAction={() => refetch()} />
          ) : data.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.map((item) => (
                <div key={item._id} className="rounded-md border border-border bg-panel-2 p-3 transition hover:border-slate-600">
                  <div className="mb-3 grid h-32 place-items-center rounded bg-[#090c13] text-accent"><File /></div>
                  <p className="truncate text-sm font-medium text-white">{item.originalName}</p>
                  <p className="mt-1 text-xs text-muted">{item.mimeType} - {formatBytes(item.size)}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(`${location.origin}/media/${item._id}`); toast.success("URL copied"); }}><Copy size={14} /> Copy</Button>
                    <LoadingButton variant="secondary" size="sm" loading={deleteMutation.isPending && deleteMutation.variables === item._id} loadingText="Deleting..." disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(item._id)}><Trash2 size={14} /> Delete</LoadingButton>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={File} title="Your library is empty" text="Drag a file into the uploader or use the API to start building your media library." action="Upload file" />}
          {isFetching && !isLoading && <p className="mt-3 text-xs text-muted">Refreshing media library...</p>}
        </Card>
      </div>
    </PageShell>
  );
}
