import { BookOpen, Bot, ChevronRight, Copy, Terminal } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo";
import { withApiBase } from "@/lib/url";

const nav = ["Overview", "Create bot", "Connect channel", "API upload", "Folders", "Stream files"];

export default function PublicDocs() {
  const code = `curl -X POST ${withApiBase("/api/v1/upload")} \\
  -H "x-api-key: your_api_key_here" \\
  -H "x-api-secret: example_secret" \\
  -F "file=@image.png"`;
  const folderCode = `curl -X POST ${withApiBase("/api/v1/folders")} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: your_api_key_here" \\
  -H "x-api-secret: example_secret" \\
  -d '{"name":"avatars"}'`;

  return (
    <>
      <Seo title="Docs - TeleStore" description="Developer documentation for Telegram workspace setup and media uploads." />
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border border-border bg-panel p-3">
            {nav.map((item) => <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="flex items-center justify-between rounded px-3 py-2 text-sm text-muted hover:bg-panel-2 hover:text-white">{item}<ChevronRight size={14} /></a>)}
          </div>
        </aside>
        <div className="space-y-8">
          <section id="overview" className="rounded-xl border border-border bg-panel p-6">
            <BookOpen className="text-accent" />
            <h1 className="mt-5 text-4xl font-semibold text-white">Developer docs</h1>
            <p className="mt-3 max-w-2xl text-muted">Connect a Telegram bot, validate channel access and upload media into your own Telegram channel.</p>
          </section>
          {["Create bot", "Connect channel", "API upload", "Folders", "Stream files"].map((title, index) => (
            <Card id={title.toLowerCase().replaceAll(" ", "-")} key={title} className="p-6">
              {index === 0 ? <Bot className="text-accent" /> : <Terminal className="text-accent" />}
              <h2 className="mt-4 text-2xl font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Follow this step to prepare your Telegram workspace, create scoped API keys, then use TeleStore from external apps.</p>
              {index === 2 && <div className="mt-4"><div className="mb-2 flex justify-end"><Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }}><Copy size={14} /> Copy</Button></div><pre className="overflow-auto rounded-md bg-[#090c13] p-4 text-sm text-slate-300"><code>{code}</code></pre></div>}
              {index === 3 && <div className="mt-4"><div className="mb-2 flex justify-end"><Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(folderCode); toast.success("Copied"); }}><Copy size={14} /> Copy</Button></div><pre className="overflow-auto rounded-md bg-[#090c13] p-4 text-sm text-slate-300"><code>{folderCode}</code></pre></div>}
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
