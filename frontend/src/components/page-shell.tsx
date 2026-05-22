import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function PageShell({ eyebrow, title, description, children, wide = false }: { eyebrow?: string; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className={`mx-auto w-full px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-8 sm:pt-7 lg:px-8 ${wide ? "max-w-[1760px]" : "max-w-7xl"}`}>
      <div className="mb-5 flex flex-col gap-2 sm:mb-7">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base sm:leading-7">{description}</p>}
      </div>
      {children}
    </motion.main>
  );
}
