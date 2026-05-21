import { Copy, FolderPlus, KeyRound, LockKeyhole, Terminal, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const auth = `x-api-key: your_api_key_here
x-api-secret: example_secret`;

const uploadCurl = `curl -X POST http://localhost:4000/api/v1/upload \\
  -H "x-api-key: your_api_key_here" \\
  -H "x-api-secret: example_secret" \\
  -F "file=@image.png" \\
  -F "visibility=public" \\
  -F 'tags=["hero","marketing"]'`;

const jsUpload = `const form = new FormData();
form.append("file", file);
form.append("visibility", "public");
form.append("tags", JSON.stringify(["avatar"]));

const res = await fetch("https://your-domain.com/api/v1/upload", {
  method: "POST",
  headers: {
    "x-api-key": "your_api_key_here",
    "x-api-secret": "example_secret"
  },
  body: form
});

const { data } = await res.json();`;

const folderCurl = `curl -X POST http://localhost:4000/api/v1/folders \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: your_api_key_here" \\
  -H "x-api-secret: example_secret" \\
  -d '{"name":"avatars"}'`;

const endpoints = [
  ["POST", "/api/v1/upload", "Upload one or more files using multipart form data."],
  ["GET", "/api/v1/files", "List files in the authenticated workspace."],
  ["GET", "/api/v1/media/:id", "Fetch metadata, public URLs and status for one file."],
  ["DELETE", "/api/v1/media/:id", "Delete media from Telegram and MongoDB."],
  ["POST", "/api/v1/folders", "Create a folder for organizing uploads."],
  ["GET", "/api/v1/folders", "List folders, optionally filtered by parentId."]
];

const credentialCards = [
  { title: "Public API key", icon: KeyRound, text: "Workspace identifier used by external API clients." },
  { title: "Secret key", icon: LockKeyhole, text: "Shown once, stored hashed, and safe to regenerate any time." },
  { title: "Scoped access", icon: UploadCloud, text: "Grant upload, read, write, delete or full access per key." },
  { title: "Clean URLs", icon: Terminal, text: "/media/:id/view for browser viewing and streaming." }
];

function CopyButton({ value }: { value: string }) {
  return <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}><Copy size={14} /> Copy</Button>;
}

function CodeBlock({ title, value }: { title: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">{title}</h2>
        <CopyButton value={value} />
      </div>
      <pre className="overflow-auto rounded-md bg-[#090c13] p-4 text-sm leading-6 text-slate-300"><code>{value}</code></pre>
    </Card>
  );
}

export default function Docs() {
  return (
    <PageShell eyebrow="Documentation" title="API-ready media storage" description="Use TeleStore from dashboards, frontend apps, backend services and future SDKs with scoped API keys.">
      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <aside className="hidden xl:block">
          <Card className="sticky top-24 p-3">
            {["Credentials", "Upload", "Folders", "Endpoints", "Future SDKs"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="block rounded px-3 py-2 text-sm text-muted hover:bg-panel-2 hover:text-white">{item}</a>
            ))}
          </Card>
        </aside>

        <div className="space-y-5">
          <section id="credentials" className="grid gap-4 md:grid-cols-3">
            {credentialCards.map(({ title, icon: Icon, text }) => (
              <Card key={title} className="p-5">
                <Icon className="text-accent" />
                <h2 className="mt-4 font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </Card>
            ))}
          </section>

          <CodeBlock title="Auth headers" value={auth} />
          <CodeBlock title="Upload with curl" value={uploadCurl} />
          <CodeBlock title="Upload from JavaScript" value={jsUpload} />
          <CodeBlock title="Create folder" value={folderCurl} />

          <Card id="endpoints" className="p-5">
            <h2 className="font-semibold text-white">API endpoints</h2>
            <div className="mt-4 divide-y divide-border">
              {endpoints.map(([method, path, description]) => (
                <div key={path} className="grid gap-2 py-3 md:grid-cols-[90px_1fr_2fr]">
                  <span className="w-fit rounded bg-accent/12 px-2 py-1 text-xs font-semibold text-accent">{method}</span>
                  <code className="text-sm text-slate-200">{path}</code>
                  <p className="text-sm text-muted">{description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card id="future-sdks" className="p-5">
            <FolderPlus className="text-accent" />
            <h2 className="mt-4 font-semibold text-white">SDK-ready shape</h2>
            <p className="mt-2 text-sm leading-6 text-muted">The v1 API is intentionally small and stable so future JavaScript, React, Node.js, Python and Flutter SDKs can wrap upload, folders, list, fetch and delete without knowing anything about Telegram internals.</p>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
