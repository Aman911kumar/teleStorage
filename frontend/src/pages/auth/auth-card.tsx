import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Database } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <Card className="p-6">
      <Link to="/" className="mb-6 flex items-center gap-2 font-semibold text-white">
        <span className="rounded-md bg-accent p-1.5"><Database size={18} /></span>
        TeleStore
      </Link>
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>
      <div className="mt-6">{children}</div>
      <div className="mt-5 text-center text-sm text-muted">{footer}</div>
    </Card>
  );
}
