import { ArrowRight, Gauge, Image, Layers3, Play, Settings2, Sparkles, UploadCloud } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/seo";

const workflow = ["Connect bot", "Validate channel", "Upload media", "Stream securely"];

export default function Features() {
  return (
    <>
      <Seo title="Features - TeleStore" description="Explore Telegram-powered media hosting, optimization and streaming features." />
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(91,140,255,0.22),transparent_28rem)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Product Features</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl">A complete media console for your Telegram cloud.</h1>
              <p className="mt-5 max-w-xl text-muted">Upload, optimize, preview and stream images, videos and files from a channel you control.</p>
              <Link to="/signup"><Button className="mt-8">Create workspace <ArrowRight size={16} /></Button></Link>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 sm:grid-cols-2">
              {[
                ["Image optimization", Image, "WebP conversion, quality control and EXIF cleanup."],
                ["Video pipeline", Play, "Compression, thumbnails, streaming and range delivery."],
                ["Upload controls", UploadCloud, "Queue, retry, speed and progress states."],
                ["Workspace health", Gauge, "Telegram validation and connection status."]
              ].map(([title, Icon, text]) => (
                <Card key={title as string} className="p-5 odd:translate-y-4">
                  <Icon className="text-accent" />
                  <h2 className="mt-5 font-semibold text-white">{title as string}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{text as string}</p>
                </Card>
              ))}
            </motion.div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:px-8">
          {[
            ["Media library", "Masonry grid, list view, search, filters and preview actions make your channel feel like a real media CDN.", Layers3],
            ["Optimization controls", "Tune image width, quality, WebP conversion, video resolution and allowed MIME types per workspace.", Settings2],
            ["Polished delivery", "Generate clean hosted URLs while the backend fetches, caches and streams from Telegram safely.", Sparkles]
          ].map(([title, text, Icon], index) => (
            <div key={title as string} className="grid items-center gap-8 lg:grid-cols-2">
              <div className={index % 2 ? "lg:order-2" : ""}>
                <Icon className="text-accent" size={28} />
                <h2 className="mt-4 text-2xl font-semibold text-white">{title as string}</h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-muted">{text as string}</p>
              </div>
              <div className="rounded-xl border border-border bg-panel p-3">
                <div className="grid h-64 place-items-center rounded-lg bg-[#090c13] text-sm text-muted">
                  {title as string} preview
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-border bg-panel p-5">
            <div className="grid gap-3 md:grid-cols-4">
              {workflow.map((step, index) => (
                <div key={step} className="rounded-lg bg-panel-2 p-4">
                  <p className="text-xs text-accent">0{index + 1}</p>
                  <p className="mt-8 font-medium text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
