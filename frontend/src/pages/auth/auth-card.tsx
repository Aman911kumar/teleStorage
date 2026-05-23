import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HardDrive, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <Card className="border-white/10 bg-[#10141d]/88 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-7">
      <Link to="/" className="mb-6 flex items-center gap-2 font-semibold text-white">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-[linear-gradient(180deg,#7b96ff,#526fff)] shadow-[0_10px_26px_rgba(82,111,255,0.24)]"><HardDrive size={17} /></span>
        TeleStorage
      </Link>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
        <ShieldCheck size={13} /> Secure account access
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
      <div className="mt-6">{children}</div>
      <div className="mt-5 text-center text-sm text-muted">{footer}</div>
    </Card>
  );
}
