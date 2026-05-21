import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function PageShell({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children: ReactNode }) {
  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-2">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="max-w-3xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {children}
    </motion.main>
  );
}
