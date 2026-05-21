import { FileUp, Gauge, Settings, User } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";

const copy = {
  uploads: ["Uploads", "Upload queue, retries, compression status and progress history.", FileUp],
  optimization: ["Optimization", "Image, video, file, cache and upload restriction settings.", Gauge],
  profile: ["Profile", "Account details and email preferences.", User],
  settings: ["Settings", "Security, theme, webhook and workspace preferences.", Settings]
} as const;

export default function SimpleAppPage({ kind }: { kind: keyof typeof copy }) {
  const [title, description, Icon] = copy[kind];
  return (
    <PageShell eyebrow="Workspace" title={title} description={description}>
      <Card className="p-6">
        <Icon className="text-accent" />
        <h2 className="mt-5 font-semibold text-white">{title} module</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">The UI structure is ready for production data. Connect additional backend endpoints here as the storage platform grows.</p>
      </Card>
    </PageShell>
  );
}
