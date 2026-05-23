import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  Copy,
  Database,
  FileJson,
  FolderTree,
  Globe2,
  KeyRound,
  LockKeyhole,
  Radio,
  Search,
  Send,
  ShieldCheck,
  UploadCloud,
  Webhook
} from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Seo } from "@/components/seo";
import { getApiBaseUrl } from "@/lib/url";

const sections = [
  { id: "overview", title: "Overview", icon: BookOpen },
  { id: "quick-start", title: "Quick start", icon: Send },
  { id: "telegram", title: "Telegram setup", icon: Bot },
  { id: "auth", title: "Authentication", icon: KeyRound },
  { id: "upload", title: "Upload API", icon: UploadCloud },
  { id: "folders", title: "Folders & paths", icon: FolderTree },
  { id: "media", title: "Media API", icon: FileJson },
  { id: "streaming", title: "Streaming", icon: Radio },
  { id: "errors", title: "Errors", icon: AlertTriangle },
  { id: "webhooks", title: "Webhooks", icon: Webhook },
  { id: "production", title: "Production", icon: ShieldCheck }
];

const endpoints = [
  ["POST", "/api/v1/upload", "Upload files with multipart/form-data."],
  ["GET", "/api/v1/files", "List files for a workspace."],
  ["GET", "/api/v1/media/:id", "Fetch one media object."],
  ["PATCH", "/api/v1/media/:id", "Rename or move a file."],
  ["DELETE", "/api/v1/media/:id", "Delete a file."],
  ["POST", "/api/v1/folders", "Create a folder."],
  ["GET", "/api/v1/folders", "List folders by parent."],
  ["POST", "/api/v1/media/:id/links", "Create temporary links."]
];

const errorRows = [
  ["400", "FILE_REQUIRED", "Attach at least one file in the multipart body."],
  ["401", "MISSING_API_CREDENTIALS", "Send x-api-key and x-api-secret headers."],
  ["403", "FORBIDDEN", "The key is valid but does not have the required scope."],
  ["409", "DUPLICATE_MEDIA", "This checksum already exists in the workspace."],
  ["413", "FILE_TOO_LARGE", "File exceeded the configured upload limit."],
  ["429", "RATE_LIMITED", "Retry after the current rate window resets."],
  ["502", "TELEGRAM_SERVICE_UNAVAILABLE", "Telegram could not complete the storage request."]
];

function copy(value: string) {
  navigator.clipboard.writeText(value);
  toast.success("Copied");
}

function CodeBlock({ title, value, language = "bash" }: { title: string; value: string; language?: string }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-white/2.5 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-muted">{language}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => copy(value)}><Copy size={14} /> Copy</Button>
      </div>
      <pre className="thin-scrollbar overflow-auto whitespace-pre-wrap break-words bg-[#070a10] p-4 text-xs leading-6 text-slate-300 sm:text-sm"><code>{value}</code></pre>
    </Card>
  );
}

function Step({ index, title, text }: { index: number; title: string; text: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-accent/15 text-sm font-semibold text-accent">{index}</div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </Card>
  );
}

export default function PublicDocs() {
  const [query, setQuery] = useState("");
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const filteredSections = sections.filter((section) => section.title.toLowerCase().includes(query.toLowerCase()));
  const snippets = {
    auth: `x-api-key: demo_public_key
x-api-secret: your_secret_key_here`,
    upload: `curl -X POST ${apiBaseUrl}/api/v1/upload \\
  -H "x-api-key: demo_public_key" \\
  -H "x-api-secret: your_secret_key_here" \\
  -F "file=@avatar.png" \\
  -F "visibility=public" \\
  -F 'tags=["avatar","profile"]' \\
  -F 'folderPath=["users","avatars"]'`,
    javascript: `const form = new FormData();
form.append("file", file);
form.append("visibility", "public");
form.append("folderPath", JSON.stringify(["products", "logos"]));
form.append("metadata", JSON.stringify({ source: "web" }));

const response = await fetch("${apiBaseUrl}/api/v1/upload", {
  method: "POST",
  headers: {
    "x-api-key": "demo_public_key",
    "x-api-secret": "your_secret_key_here"
  },
  body: form
});

const result = await response.json();`,
    folder: `curl -X POST ${apiBaseUrl}/api/v1/folders \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: demo_public_key" \\
  -H "x-api-secret: your_secret_key_here" \\
  -d '{"name":"avatars","parentId":"optional_parent_id"}'`,
    response: `{
  "success": true,
  "data": {
    "files": [
      {
        "id": "media_id_here",
        "publicUrl": "/media/media_id_here/view",
        "downloadUrl": "/media/media_id_here/download",
        "thumbUrl": "/media/media_id_here/thumb",
        "duplicate": false
      }
    ]
  }
}`,
    webhook: `{
  "event": "upload.completed",
  "workspaceId": "workspace_id_here",
  "mediaId": "media_id_here",
  "timestamp": "2026-05-23T10:00:00.000Z"
}`
  };

  return (
    <>
      <Seo title="Docs - TeleStorage" description="Complete developer documentation for Telegram-backed media uploads, folders, streaming, and API integration." />
      <main className="mx-auto grid max-w-[1500px] gap-6 px-3 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <Card className="p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 text-muted" size={15} />
                <Input className="h-11 pl-9" placeholder="Search docs" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <nav className="mt-3 space-y-1">
                {filteredSections.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-muted transition hover:bg-panel-2 hover:text-white">
                    <span className="flex items-center gap-2"><item.icon size={15} className="text-accent" /> {item.title}</span>
                    <ChevronRight size={14} />
                  </a>
                ))}
              </nav>
            </Card>
          </div>
        </aside>

        <div className="min-w-0 space-y-8">
          <section id="overview" className="surface rounded-xl p-5 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/3 px-3 py-1 text-xs text-muted"><BookOpen size={14} className="text-accent" /> Developer docs</div>
            <h1 className="mt-5 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">Build media uploads, folders, and previews with TeleStorage.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">TeleStorage lets your dashboard and external apps upload files into your own Telegram bot and channel while your backend provides clean API responses, private storage, and browser-safe streaming URLs.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Dashboard + API", Database],
                ["Telegram storage", Bot],
                ["Proxy streaming", Globe2]
              ].map(([label, Icon]) => (
                <div key={label as string} className="rounded-lg border border-border bg-[#090c13] p-4 text-sm font-medium text-white"><Icon className="mb-3 text-accent" size={20} />{label as string}</div>
              ))}
            </div>
          </section>

          <section id="quick-start" className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Quick start</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Step index={1} title="Create workspace" text="Sign in and create a workspace for the product, app, or environment you want to store media for." />
              <Step index={2} title="Connect Telegram" text="Paste your bot token and channel ID. TeleStorage validates bot access and permissions." />
              <Step index={3} title="Create API key" text="Generate a scoped public key and secret for external app integration." />
              <Step index={4} title="Upload first file" text="Use dashboard upload, cURL, JavaScript, or your backend server to upload media." />
            </div>
          </section>

          <section id="telegram" className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Telegram setup</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-5">
                <Bot className="text-accent" />
                <h3 className="mt-4 font-semibold text-white">Bot requirements</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                  <li>Create a bot with BotFather.</li>
                  <li>Add the bot to your storage channel.</li>
                  <li>Make the bot an admin with post and delete permissions.</li>
                  <li>Keep the token private. TeleStorage encrypts it before saving.</li>
                </ul>
              </Card>
              <Card className="p-5">
                <CheckCircle2 className="text-emerald-300" />
                <h3 className="mt-4 font-semibold text-white">Validation checks</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                  <li>Bot token format and bot identity.</li>
                  <li>Channel access and channel title.</li>
                  <li>Admin status and upload permissions.</li>
                  <li>Connection health for future uploads.</li>
                </ul>
              </Card>
            </div>
          </section>

          <section id="auth" className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Authentication</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5"><KeyRound className="text-accent" /><h3 className="mt-4 font-semibold text-white">Public key</h3><p className="mt-2 text-sm leading-6 text-muted">Identifies your workspace and can be used with a secret or upload token.</p></Card>
              <Card className="p-5"><LockKeyhole className="text-accent" /><h3 className="mt-4 font-semibold text-white">Secret key</h3><p className="mt-2 text-sm leading-6 text-muted">Server-side credential for write, delete, and admin actions.</p></Card>
              <Card className="p-5"><ShieldCheck className="text-accent" /><h3 className="mt-4 font-semibold text-white">Scopes</h3><p className="mt-2 text-sm leading-6 text-muted">Use upload, read, write, delete, admin, or full access scopes.</p></Card>
            </div>
            <CodeBlock title="API headers" value={snippets.auth} language="http" />
          </section>

          <section id="upload" className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Upload API</h2>
            <p className="max-w-4xl text-sm leading-7 text-muted">Use `POST /api/v1/upload` for images, videos, PDFs, ZIPs, and documents. Send `file` for one file or `files` for multiple files. Optional fields include `folderId`, `folderPath`, `visibility`, `tags`, `metadata`, and `filename`.</p>
            <div className="grid gap-4 xl:grid-cols-2">
              <CodeBlock title="Upload with cURL" value={snippets.upload} />
              <CodeBlock title="Upload with JavaScript" value={snippets.javascript} language="javascript" />
            </div>
            <CodeBlock title="Upload response" value={snippets.response} language="json" />
          </section>

          <section id="folders" className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Folders & paths</h2>
            <Card className="p-5">
              <FolderTree className="text-accent" />
              <h3 className="mt-4 font-semibold text-white">Nested folder paths are arrays</h3>
              <p className="mt-2 text-sm leading-7 text-muted">Use `folderPath` as an array such as `["products","logos","2026"]`. Do not flatten paths into a single string unless you are using a legacy integration. The backend converts old `a/b/c` paths safely for compatibility.</p>
            </Card>
            <CodeBlock title="Create folder" value={snippets.folder} />
          </section>

          <section id="media" className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Media API</h2>
            <Card className="overflow-hidden p-0">
              <div className="hidden grid-cols-[90px_1fr_2fr] border-b border-border bg-white/2.5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted md:grid"><span>Method</span><span>Endpoint</span><span>Description</span></div>
              {endpoints.map(([method, path, description]) => (
                <div key={`${method}-${path}`} className="grid gap-2 border-b border-border/70 px-4 py-3 text-sm md:grid-cols-[90px_1fr_2fr]">
                  <span className="w-fit rounded bg-accent/12 px-2 py-1 text-xs font-semibold text-accent">{method}</span>
                  <code className="break-all text-slate-200">{path}</code>
                  <p className="text-muted">{description}</p>
                </div>
              ))}
            </Card>
          </section>

          <section id="streaming" className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Streaming</h2>
            <Card className="p-5">
              <Radio className="text-accent" />
              <p className="mt-4 text-sm leading-7 text-muted">Browsers should never use Telegram file IDs or raw Telegram URLs. Use TeleStorage proxy routes instead: `/media/:id/view`, `/media/:id/download`, and `/media/:id/thumb`. Videos support range requests for seeking and resumable playback.</p>
            </Card>
          </section>

          <section id="errors" className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Errors</h2>
            <Card className="overflow-hidden p-0">
              {errorRows.map(([status, code, help]) => (
                <div key={code} className="grid gap-2 border-b border-border/70 px-4 py-3 text-sm md:grid-cols-[80px_1fr_2fr]">
                  <span className="text-red-300">{status}</span>
                  <code className="break-all text-white">{code}</code>
                  <p className="text-muted">{help}</p>
                </div>
              ))}
            </Card>
          </section>

          <section id="webhooks" className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">Webhooks</h2>
            <p className="text-sm leading-7 text-muted">Webhook models are prepared for upload and delete events. They are useful for syncing external apps after media changes.</p>
            <CodeBlock title="Webhook payload" value={snippets.webhook} language="json" />
          </section>

          <section id="production" className="space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">Production guide</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Keep secrets server-side", "Never expose secret keys or Telegram bot tokens in frontend bundles."],
                ["Use HTTPS", "Avoid mixed content between your frontend and backend media URLs."],
                ["Respect rate limits", "Retry failed Telegram uploads with backoff and avoid duplicate submissions."],
                ["Monitor storage health", "Run sync checks to remove records for Telegram files that no longer exist."]
              ].map(([title, text]) => (
                <Card key={title} className="p-5"><h3 className="font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{text}</p></Card>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
