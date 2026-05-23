import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Code2,
  Copy,
  FileJson,
  FolderPlus,
  Globe2,
  KeyRound,
  LockKeyhole,
  Play,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Terminal,
  UploadCloud,
  Webhook
} from "lucide-react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiBaseUrl } from "@/lib/url";

type Section = {
  id: string;
  title: string;
  eyebrow: string;
  icon: typeof BookOpen;
  keywords: string[];
};

const sections: Section[] = [
  { id: "intro", title: "Introduction", eyebrow: "Start here", icon: BookOpen, keywords: ["overview", "telegram", "storage"] },
  { id: "quick-start", title: "Quick Start", eyebrow: "5 minutes", icon: Play, keywords: ["workspace", "bot", "channel", "first upload"] },
  { id: "auth", title: "Authentication", eyebrow: "API keys", icon: KeyRound, keywords: ["secret", "headers", "bearer"] },
  { id: "upload", title: "Upload API", eyebrow: "Multipart", icon: UploadCloud, keywords: ["upload", "files", "metadata", "tags"] },
  { id: "folders", title: "Folder API", eyebrow: "Organize", icon: FolderPlus, keywords: ["folder", "move", "nested"] },
  { id: "media", title: "Media API", eyebrow: "Manage", icon: FileJson, keywords: ["fetch", "delete", "restore", "list"] },
  { id: "streaming", title: "Streaming & Preview", eyebrow: "Proxy CDN", icon: Radio, keywords: ["preview", "streaming", "video", "thumbnail"] },
  { id: "sdk", title: "SDK Usage", eyebrow: "Copy paste", icon: Code2, keywords: ["javascript", "react", "node", "python", "flutter"] },
  { id: "errors", title: "Error Handling", eyebrow: "Reliable apps", icon: AlertTriangle, keywords: ["errors", "status", "retry"] },
  { id: "rate-limits", title: "Rate Limits", eyebrow: "Abuse protection", icon: ShieldCheck, keywords: ["limits", "429", "retry"] },
  { id: "webhooks", title: "Webhooks", eyebrow: "Events", icon: Webhook, keywords: ["events", "upload completed", "media deleted"] },
  { id: "production", title: "Production Guide", eyebrow: "Ship safely", icon: Globe2, keywords: ["security", "deployment", "cache"] }
];

const endpoints = [
  ["POST", "/api/v1/upload", "Upload one or more files with multipart/form-data."],
  ["GET", "/api/v1/files", "List files in the authenticated workspace."],
  ["GET", "/api/v1/media/:id", "Fetch metadata and generated URLs for one file."],
  ["PATCH", "/api/v1/media/:id", "Rename a file or move it to another folder."],
  ["DELETE", "/api/v1/media/:id", "Delete media from Telegram and mark/remove the record."],
  ["POST", "/api/v1/folders", "Create a folder."],
  ["GET", "/api/v1/folders", "List folders, optionally by parentId."],
  ["POST", "/api/v1/media/:id/links", "Generate expiring preview/download links."]
];

const errors = [
  ["401", "INVALID_API_KEY", "Check x-api-key or Authorization header."],
  ["403", "FORBIDDEN", "The API key scope does not allow this action."],
  ["413", "FILE_TOO_LARGE", "Reduce file size or update upload limits."],
  ["415", "UNSUPPORTED_MEDIA_TYPE", "Upload an allowed image, video, PDF, ZIP or document."],
  ["429", "RATE_LIMITED", "Retry after the window resets."],
  ["502", "TELEGRAM_SERVICE_UNAVAILABLE", "Retry with backoff; Telegram may be unavailable."]
];

const snippets = {
  authHeaders: `x-api-key: demo_public_key
x-api-secret: your_secret_key_here`,
  bearer: `Authorization: Bearer demo_public_key:your_secret_key_here`,
  curlUpload: `curl -X POST https://your-domain.com/api/v1/upload \\
  -H "x-api-key: demo_public_key" \\
  -H "x-api-secret: your_secret_key_here" \\
  -F "file=@avatar.png" \\
  -F "visibility=public" \\
  -F 'tags=["avatar","profile"]' \\
  -F 'metadata={"userId":"user_123"}'`,
  multiUpload: `curl -X POST https://your-domain.com/api/v1/upload \\
  -H "x-api-key: demo_public_key" \\
  -H "x-api-secret: your_secret_key_here" \\
  -F "files=@hero.png" \\
  -F "files=@intro.mp4" \\
  -F "folderId=folder_id_here"`,
  javascript: `const form = new FormData();
form.append("file", file);
form.append("visibility", "public");
form.append("tags", JSON.stringify(["avatar"]));

const res = await fetch("https://your-domain.com/api/v1/upload", {
  method: "POST",
  headers: {
    "x-api-key": "demo_public_key",
    "x-api-secret": "your_secret_key_here"
  },
  body: form
});

const json = await res.json();
console.log(json.data.files[0].publicUrl);`,
  react: `function AvatarUploader() {
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/v1/upload", {
      method: "POST",
      headers: {
        "x-api-key": "demo_public_key",
        "x-api-secret": "your_secret_key_here"
      },
      body: form
    });

    return res.json();
  }

  return <input type="file" onChange={upload} />;
}`,
  node: `import fs from "node:fs";
import FormData from "form-data";
import fetch from "node-fetch";

const form = new FormData();
form.append("file", fs.createReadStream("./invoice.pdf"));

const res = await fetch("https://your-domain.com/api/v1/upload", {
  method: "POST",
  headers: {
    "x-api-key": "demo_public_key",
    "x-api-secret": "your_secret_key_here",
    ...form.getHeaders()
  },
  body: form
});`,
  next: `export async function POST(request) {
  const form = await request.formData();
  const res = await fetch("https://your-domain.com/api/v1/upload", {
    method: "POST",
    headers: {
      "x-api-key": process.env.STORAGE_API_KEY,
      "x-api-secret": process.env.STORAGE_API_SECRET
    },
    body: form
  });
  return Response.json(await res.json());
}`,
  express: `app.post("/upload", upload.single("file"), async (req, res) => {
  const form = new FormData();
  form.append("file", fs.createReadStream(req.file.path));

  const response = await fetch("https://your-domain.com/api/v1/upload", {
    method: "POST",
    headers: {
      "x-api-key": process.env.STORAGE_API_KEY,
      "x-api-secret": process.env.STORAGE_API_SECRET,
      ...form.getHeaders()
    },
    body: form
  });

  res.json(await response.json());
});`,
  python: `import requests

with open("avatar.png", "rb") as file:
    response = requests.post(
        "https://your-domain.com/api/v1/upload",
        headers={
            "x-api-key": "demo_public_key",
            "x-api-secret": "your_secret_key_here"
        },
        files={"file": file},
        data={"visibility": "public"}
    )

print(response.json())`,
  flutter: `final request = http.MultipartRequest(
  "POST",
  Uri.parse("https://your-domain.com/api/v1/upload"),
);
request.headers["x-api-key"] = "demo_public_key";
request.headers["x-api-secret"] = "your_secret_key_here";
request.files.add(await http.MultipartFile.fromPath("file", image.path));

final response = await request.send();`,
  createFolder: `curl -X POST https://your-domain.com/api/v1/folders \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: demo_public_key" \\
  -H "x-api-secret: your_secret_key_here" \\
  -d '{"name":"avatars","parentId":"parent_folder_id"}'`,
  moveFile: `curl -X PATCH https://your-domain.com/api/v1/media/media_id_here \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: demo_public_key" \\
  -H "x-api-secret: your_secret_key_here" \\
  -d '{"folderId":"folder_id_here"}'`,
  responseSuccess: `{
  "success": true,
  "data": {
    "files": [
      {
        "id": "media_id_here",
        "publicUrl": "/media/media_id_here/view",
        "apiUrl": "/api/v1/media/media_id_here",
        "downloadUrl": "/media/media_id_here/download",
        "thumbUrl": "/media/media_id_here/thumb"
      }
    ]
  }
}`,
  responseError: `{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please slow down and retry."
  }
}`,
  webhook: `{
  "event": "upload.completed",
  "workspaceId": "workspace_id_here",
  "mediaId": "media_id_here",
  "timestamp": "2026-05-22T10:00:00.000Z"
}`,
  playgroundCurl: `curl -X POST https://your-domain.com/api/v1/upload \\
  -H "x-api-key: demo_public_key" \\
  -H "x-api-secret: your_secret_key_here" \\
  -F "file=@sample.png"`
};

function copy(value: string) {
  navigator.clipboard.writeText(value);
  toast.success("Copied");
}

function CodeBlock({ title, value, language = "bash" }: { title: string; value: string; language?: string }) {
  return (
    <Card className="overflow-hidden rounded-lg p-0">
      <div className="flex items-center justify-between border-b border-border/70 bg-white/2.5 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-muted">{language}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => copy(value)}><Copy size={14} /> Copy</Button>
      </div>
      <pre className="overflow-auto bg-[#070a10] p-4 text-xs leading-6 text-slate-300"><code>{value}</code></pre>
    </Card>
  );
}

function StepCard({ index, title, text }: { index: number; title: string; text: string }) {
  return (
    <Card className="rounded-lg p-5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-sm font-bold text-accent">{index}</div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
      <div className="mt-4 grid h-24 place-items-center rounded-lg border border-dashed border-border/70 bg-[#090c13] text-xs text-muted">Screenshot placeholder</div>
    </Card>
  );
}

export default function Docs() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"javascript" | "react" | "node" | "next" | "express" | "python" | "flutter">("javascript");
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const dynamicSnippets = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(snippets).map(([key, value]) => [
          key,
          value.replaceAll("https://your-domain.com", apiBaseUrl).replaceAll("http://localhost:4000", apiBaseUrl)
        ])
      ) as typeof snippets,
    [apiBaseUrl]
  );
  const filteredSections = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return sections;
    return sections.filter((section) => [section.title, section.eyebrow, ...section.keywords].some((item) => item.toLowerCase().includes(value)));
  }, [query]);

  const sdkSnippets = {
    javascript: dynamicSnippets.javascript,
    react: dynamicSnippets.react,
    node: dynamicSnippets.node,
    next: dynamicSnippets.next,
    express: dynamicSnippets.express,
    python: dynamicSnippets.python,
    flutter: dynamicSnippets.flutter
  };

  return (
    <PageShell wide eyebrow="Developer Docs" title="Build with the TeleStorage API" description="Production-ready guides, copyable examples, and API references for Telegram-backed media storage.">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
        <div className="min-w-0 space-y-8">
          <Card className="rounded-lg p-3 xl:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 text-muted" size={16} />
              <Input className="h-11 pl-10 text-base sm:text-sm" placeholder="Search docs" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="thin-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
              {filteredSections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-border bg-white/3 px-3 text-sm text-slate-300">
                  <section.icon size={15} className="text-accent" />
                  {section.title}
                </a>
              ))}
            </div>
          </Card>

          <section id="intro" className="surface rounded-xl p-4 sm:p-6">
            <BookOpen className="text-accent" size={26} />
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-white sm:text-2xl">Introduction</h2>
            <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-400">
              TeleStorage is a self-hosted storage API where each workspace connects its own Telegram bot and channel. Your apps upload to TeleStorage, TeleStorage stores files in Telegram, and browsers stream through secure backend proxy URLs.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["Dashboard uploads", "External API uploads", "Secure media streaming"].map((item) => <div key={item} className="rounded-lg bg-white/2.5 p-4 text-sm font-medium text-white"><CheckCircle2 className="mb-2 text-emerald-300" size={16} />{item}</div>)}
            </div>
          </section>

          <section id="quick-start" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Quick Start</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <StepCard index={1} title="Create a workspace" text="Sign in, open Workspaces, and create a storage workspace for your app." />
              <StepCard index={2} title="Connect Telegram" text="Create a bot with BotFather, add it as channel admin, then paste bot token and channel ID." />
              <StepCard index={3} title="Generate API keys" text="Open API Access and create a scoped key for upload, read, write, delete, or full access." />
              <StepCard index={4} title="Test first upload" text="Use the API playground or copy a cURL example to upload your first file." />
            </div>
          </section>

          <section id="auth" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Authentication</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-lg p-5"><KeyRound className="text-accent" size={21} /><h3 className="mt-3 text-base font-semibold text-white">Public API key</h3><p className="mt-2 text-sm leading-6 text-slate-400">Identifies the workspace used by the request.</p></Card>
              <Card className="rounded-lg p-5"><LockKeyhole className="text-accent" size={21} /><h3 className="mt-3 text-base font-semibold text-white">Secret key</h3><p className="mt-2 text-sm leading-6 text-slate-400">Shown once. Store it only on servers or secure environments.</p></Card>
              <Card className="rounded-lg p-5"><ShieldCheck className="text-accent" size={21} /><h3 className="mt-3 text-base font-semibold text-white">Scopes</h3><p className="mt-2 text-sm leading-6 text-slate-400">Limit each key to upload, read, write, delete, or full access.</p></Card>
            </div>
            <CodeBlock title="Header authentication" value={dynamicSnippets.authHeaders} />
            <CodeBlock title="Bearer authentication" value={dynamicSnippets.bearer} language="http" />
          </section>

          <section id="upload" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Upload API</h2>
            <p className="max-w-5xl text-sm leading-7 text-slate-400">Use `POST /api/v1/upload` with multipart form data. Supported options include `file`, `files`, `folderId`, `visibility`, `tags`, `metadata`, and custom filename fields.</p>
            <CodeBlock title="Upload with cURL" value={dynamicSnippets.curlUpload} />
            <CodeBlock title="Multiple file upload" value={dynamicSnippets.multiUpload} />
            <CodeBlock title="Success response" value={dynamicSnippets.responseSuccess} language="json" />
          </section>

          <section id="folders" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Folder API</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <CodeBlock title="Create nested folder" value={dynamicSnippets.createFolder} />
              <CodeBlock title="Move file to folder" value={dynamicSnippets.moveFile} />
            </div>
          </section>

          <section id="media" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Media API</h2>
            <Card className="overflow-hidden rounded-lg">
              <div className="hidden grid-cols-[90px_1fr_2fr] border-b border-border bg-white/2.5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted md:grid"><span>Method</span><span>Endpoint</span><span>Description</span></div>
              {endpoints.map(([method, path, description]) => (
                <div key={`${method}-${path}`} className="grid gap-2 border-b border-border/70 px-4 py-3 text-sm md:grid-cols-[90px_1fr_2fr]">
                  <span className="w-fit rounded bg-accent/12 px-2 py-1 text-xs font-semibold text-accent">{method}</span>
                  <code className="text-slate-200">{path}</code>
                  <p className="text-muted">{description}</p>
                </div>
              ))}
            </Card>
          </section>

          <section id="streaming" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Streaming & Preview</h2>
            <Card className="rounded-lg p-5">
              <div className="grid gap-3 md:grid-cols-3">
                {["Frontend requests /media/:id/view", "Backend fetches Telegram getFile", "Backend streams bytes to browser"].map((item, index) => <div key={item} className="rounded-lg bg-[#090c13] p-4 text-sm font-medium text-white"><span className="text-accent">0{index + 1}</span><p className="mt-2">{item}</p></div>)}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-400">Never expose Telegram file URLs or bot tokens in frontend code. Images, thumbnails, downloads and videos should use backend proxy routes.</p>
            </Card>
          </section>

          <section id="sdk" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">SDK Usage</h2>
            <div className="flex flex-wrap gap-2">
              {Object.keys(sdkSnippets).map((name) => <Button key={name} variant={tab === name ? "primary" : "secondary"} size="sm" onClick={() => setTab(name as typeof tab)}>{name}</Button>)}
            </div>
            <CodeBlock title={`${tab} example`} value={sdkSnippets[tab]} language={tab} />
          </section>

          <section id="errors" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Error Handling</h2>
            <CodeBlock title="Error response" value={dynamicSnippets.responseError} language="json" />
            <Card className="overflow-hidden rounded-lg">
              {errors.map(([status, code, guidance]) => (
                <div key={code} className="grid gap-2 border-b border-border/70 px-4 py-3 text-sm md:grid-cols-[80px_1fr_2fr]">
                  <span className="text-red-300">{status}</span><code className="text-white">{code}</code><p className="text-muted">{guidance}</p>
                </div>
              ))}
            </Card>
          </section>

          <section id="rate-limits" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Rate Limits</h2>
            <Card className="rounded-lg p-5"><p className="text-sm leading-7 text-slate-400">Use client-side debouncing, exponential backoff, and avoid retry storms. Upload routes and streaming routes are separately limited to protect Telegram and your backend.</p></Card>
          </section>

          <section id="webhooks" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Webhooks</h2>
            <p className="text-sm leading-7 text-slate-400">Webhook models are prepared for `upload.completed`, `upload.failed`, and `media.deleted` events.</p>
            <CodeBlock title="Webhook payload" value={dynamicSnippets.webhook} language="json" />
          </section>

          <section id="production" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Production Guide</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Store secrets server-side", "Never place secret keys in public frontend bundles."],
                ["Use proxy URLs", "Serve media through /media/:id/view, /download and /thumb."],
                ["Cache carefully", "Use temporary cache with TTL and cleanup jobs."],
                ["Monitor Telegram health", "Handle Telegram downtime with user-friendly retries."]
              ].map(([title, text]) => <Card key={title} className="rounded-lg p-5"><h3 className="text-base font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></Card>)}
            </div>
          </section>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-20 max-h-[calc(100vh-5.5rem)] space-y-4 overflow-y-auto pr-1 thin-scrollbar">
            <Card className="rounded-lg p-3">
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-3.5 text-muted" size={16} />
                <Input className="h-11 pl-10 text-sm" placeholder="Search docs" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <nav className="space-y-1">
                {filteredSections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/6 hover:text-white">
                    <span className="h-4 w-1 rounded-full bg-transparent transition group-hover:bg-accent" />
                    <section.icon size={15} className="text-accent" />
                    <span className="truncate">{section.title}</span>
                  </a>
                ))}
              </nav>
            </Card>

            <Card className="rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><Terminal size={16} className="text-accent" /> API Playground</div>
              <p className="mt-2 text-xs leading-5 text-slate-400">Copy a request, replace the file path, and run it against your backend.</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-[#090c13] p-3 text-xs text-muted">Endpoint<br /><code className="mt-1 block text-white">POST /api/v1/upload</code></div>
                <div className="rounded-lg bg-[#090c13] p-3 text-xs text-muted">Auth<br /><code className="mt-1 block text-white">x-api-key + x-api-secret</code></div>
                <Button className="h-10 w-full" onClick={() => copy(dynamicSnippets.playgroundCurl)}><Send size={15} /> Copy request</Button>
              </div>
            </Card>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
