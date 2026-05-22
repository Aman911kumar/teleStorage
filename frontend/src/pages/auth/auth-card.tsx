import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HardDrive } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <Card className="p-6">
      <Link to="/" className="mb-6 flex items-center gap-2 font-semibold text-white">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-[linear-gradient(180deg,#7b96ff,#526fff)] shadow-[0_10px_26px_rgba(82,111,255,0.24)]"><HardDrive size={17} /></span>
        TeleStore
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>
      <div className="mt-6">{children}</div>
      <div className="mt-5 text-center text-sm text-muted">{footer}</div>
    </Card>
  );
}
