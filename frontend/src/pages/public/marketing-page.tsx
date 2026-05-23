import { Cloud, Code2, UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/seo";

export default function MarketingPage({ title }: { title: string }) {
  return (
    <>
      <Seo title={`${title} - TeleStorage`} description={`${title} for the TeleStorage media storage platform.`} />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">TeleStorage</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-4 max-w-2xl text-muted">Developer-friendly media storage for images, videos and files, with dashboard analytics and provider-based infrastructure.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[["Uploads", UploadCloud], ["Delivery", Cloud], ["API", Code2]].map(([item, Icon]) => <Card key={item as string} className="p-5"><Icon className="text-accent" /><h2 className="mt-4 font-semibold text-white">{item as string}</h2><p className="mt-2 text-sm leading-6 text-muted">Minimal UI, clear API examples and production-ready storage workflows.</p></Card>)}
        </div>
      </main>
    </>
  );
}
