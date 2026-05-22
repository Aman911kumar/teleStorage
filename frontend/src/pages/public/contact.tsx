import { LifeBuoy, Mail, MapPin, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Seo } from "@/components/seo";

export default function Contact() {
  return (
    <>
      <Seo title="Contact - TeleStore" description="Get support for your Telegram media cloud setup." />
      <main className="overflow-x-hidden">
        <section className="border-b border-border bg-[linear-gradient(135deg,rgba(91,140,255,0.14),transparent_34rem)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-3 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Support</p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">Need help connecting Telegram?</h1>
              <p className="mt-5 text-muted">Send a message and we'll help with bot setup, channel IDs, deployment and media delivery issues.</p>
            </div>
            <Card className="p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Name" />
                <Input placeholder="Email" />
              </div>
              <Input className="mt-3" placeholder="Subject" />
              <textarea className="mt-3 min-h-36 w-full rounded-md border border-border bg-[#0a0d13] p-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-accent sm:text-sm" placeholder="Tell us what you are building" />
              <Button className="mt-4 w-full sm:w-auto"><Send size={16} /> Send message</Button>
            </Card>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-3 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            ["Setup help", LifeBuoy, "BotFather, channel permissions and workspace validation."],
            ["Live chat", MessageCircle, "Placeholder for future realtime support."],
            ["Email", Mail, "support@telestore.local"]
          ].map(([title, Icon, text]) => (
            <Card key={title as string} className="p-4 sm:p-5">
              <Icon className="text-accent" />
              <h2 className="mt-4 font-semibold text-white">{title as string}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text as string}</p>
            </Card>
          ))}
        </section>

        <section className="mx-auto max-w-7xl px-3 pb-12 sm:px-6 sm:pb-16 lg:px-8">
          <div className="grid gap-5 rounded-xl border border-border bg-panel p-4 sm:p-5 md:grid-cols-[1fr_1.2fr]">
            <div>
              <MapPin className="text-accent" />
              <h2 className="mt-4 text-xl font-semibold text-white">Company info</h2>
              <p className="mt-2 text-sm leading-6 text-muted">TeleStore is built for operators who want a clean self-hosted media dashboard backed by their own Telegram infrastructure.</p>
            </div>
            <div className="grid min-h-36 place-items-center rounded-lg bg-[#090c13] p-6 text-center text-sm text-muted">Live chat widget placeholder</div>
          </div>
        </section>
      </main>
    </>
  );
}
