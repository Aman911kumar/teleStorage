import { Link } from "react-router-dom";
import { ArrowRight, Bot, Database, FileVideo, Globe2, Image, Lock, Send, UploadCloud, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/seo";

const features = [
  { title: "Bring your own bot", text: "Connect your Telegram bot token and channel in a guided onboarding flow.", icon: Bot },
  { title: "Image hosting", text: "Optimize, store and deliver image assets through your own Telegram infrastructure.", icon: Image },
  { title: "Video streaming", text: "Upload videos, generate thumbnails and stream with range support.", icon: FileVideo },
  { title: "Encrypted tokens", text: "Bot tokens are encrypted at rest and never shown after saving.", icon: Lock }
];

export default function Landing() {
  const snippet = `1. Create a Telegram bot with BotFather
2. Add it as channel admin
3. Paste token + channel ID
4. Start uploading media`;
  return (
    <>
      <Seo title="TeleStorage - Telegram Powered Media Cloud" description="Store images and videos directly in your own Telegram infrastructure." />
      <main className="overflow-x-hidden">
        <section className="mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-7xl items-center gap-6 px-3 py-8 sm:gap-10 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <motion.div className="min-w-0" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-[11px] text-muted sm:mb-5 sm:text-xs"><Zap size={13} className="shrink-0 text-accent" /> <span className="truncate">Telegram powered media cloud</span></div>
            <h1 className="max-w-full text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">Store images and videos in your own Telegram cloud.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:mt-5 sm:text-base">TeleStorage is a self-hosted media dashboard where every user connects their own Telegram bot and channel to host, optimize and stream media.</p>
            <div className="mt-6 grid gap-3 sm:mt-8 sm:flex">
              <Link to="/signup" className="min-w-0"><Button className="w-full sm:w-auto" size="lg">Connect Telegram <ArrowRight size={17} /></Button></Link>
              <Link to="/docs" className="min-w-0"><Button className="w-full sm:w-auto" variant="secondary" size="lg"><Send size={17} /> Setup guide</Button></Link>
            </div>
          </motion.div>
          <Card className="min-w-0 p-3 sm:p-4">
            <div className="min-w-0 rounded-lg bg-[#090c13] p-3 sm:p-4">
              <div className="mb-4 flex items-center gap-2 text-sm text-muted"><UploadCloud size={16} /> Workspace setup</div>
              <pre className="thin-scrollbar overflow-auto whitespace-pre-wrap wrap-break-word rounded-md border border-border bg-black/30 p-3 text-xs leading-6 text-slate-300 sm:p-4 sm:text-sm"><code>{snippet}</code></pre>
              <div className="mt-4 grid gap-3 text-center text-sm sm:grid-cols-3"><div className="rounded bg-panel-2 p-3"><p className="text-white">Images</p><p className="text-muted">WebP</p></div><div className="rounded bg-panel-2 p-3"><p className="text-white">Videos</p><p className="text-muted">Stream</p></div><div className="rounded bg-panel-2 p-3"><p className="text-white">Files</p><p className="text-muted">Private</p></div></div>
            </div>
          </Card>
        </section>
        <section className="mx-auto max-w-7xl px-3 pb-12 sm:px-6 sm:pb-16 lg:px-8"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map((feature) => <Card key={feature.title} className="p-4 sm:p-5"><feature.icon className="text-accent" /><h3 className="mt-4 font-semibold text-white">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{feature.text}</p></Card>)}</div></section>
        <section className="border-y border-border bg-panel/50"><div className="mx-auto grid max-w-7xl gap-4 px-3 py-10 sm:grid-cols-3 sm:px-6 sm:py-14 lg:px-8">{[[Globe2, "Hosted media URLs"], [Lock, "Private media support"], [Database, "Your Telegram channel"]].map(([Icon, text]) => <div key={text as string} className="flex items-center gap-3 text-sm text-slate-200"><Icon className="shrink-0 text-accent" size={18} />{text as string}</div>)}</div></section>
      </main>
    </>
  );
}
