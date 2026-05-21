import { Copy } from "lucide-react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const endpoints = [
  ["POST", "/api/auth/register", "Create a user account.", `{"email":"user@example.com","password":"strong-password"}`],
  ["POST", "/api/auth/login", "Login and receive a JWT.", `{"email":"user@example.com","password":"strong-password"}`],
  ["GET", "/api/workspaces", "List connected Telegram workspaces.", `Authorization: Bearer <jwt>`],
  ["POST", "/api/workspaces/validate", "Validate bot token, channel access and admin permissions.", `{"telegramBotToken":"123:ABC","telegramChannelId":"-1001234567890"}`],
  ["POST", "/api/workspaces", "Create a workspace with encrypted Telegram token storage.", `{"name":"Media Cloud","telegramBotToken":"123:ABC","telegramChannelId":"-1001234567890"}`],
  ["PATCH", "/api/workspaces/:id/reconnect", "Update bot token or channel ID and re-test Telegram access.", `{"telegramBotToken":"123:ABC","telegramChannelId":"-1001234567890"}`],
  ["POST", "/api/upload", "Upload media to the selected Telegram workspace.", `FormData: file=<File>, workspaceId=<workspace-id>`],
  ["GET", "/api/media", "List recent uploads for the current user.", `Authorization: Bearer <jwt>`],
  ["GET", "/api/media/:id", "Stream media with range support for video.", `GET /api/media/:id?token=<signed-url-token>`],
  ["DELETE", "/api/media/:id", "Delete an uploaded media record.", `Authorization: Bearer <jwt>`],
  ["GET", "/api/analytics", "Workspace storage, upload, file type and health analytics.", `Authorization: Bearer <jwt>`]
];

const guide = `1. Message @BotFather and create a new bot.
2. Copy the bot token.
3. Create a Telegram channel.
4. Add the bot as an administrator.
5. Get the channel ID, usually like -1001234567890.
6. Create a TeleStore workspace and validate the connection.`;

function CopyButton({ value }: { value: string }) {
  return <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}><Copy size={14} /> Copy</Button>;
}

export default function Docs() {
  return (
    <PageShell eyebrow="Documentation" title="Telegram workspace guide" description="Request and response structures for self-hosted Telegram media storage with connected bot and channel workspaces.">
      <div className="grid gap-5">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Beginner setup</h2><CopyButton value={guide} /></div>
          <pre className="overflow-auto rounded-md bg-[#090c13] p-4 text-sm leading-6 text-slate-300"><code>{guide}</code></pre>
        </Card>
        {endpoints.map(([method, path, description, request]) => (
          <Card key={`${method}-${path}`} className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className="rounded bg-accent/12 px-2 py-1 text-xs font-semibold text-accent">{method}</span><code className="rounded bg-[#090c13] px-2 py-1 text-sm text-slate-200">{path}</code></div>
                <p className="mt-3 text-sm text-muted">{description}</p>
              </div>
              <CopyButton value={`${method} ${path}`} />
            </div>
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-white">Request</h3>
              <pre className="overflow-auto rounded-md bg-[#090c13] p-4 text-sm leading-6 text-slate-300"><code>{request}</code></pre>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
