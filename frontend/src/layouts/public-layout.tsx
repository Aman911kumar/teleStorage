import { Link, Outlet } from "react-router-dom";
import { HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicLayout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-[#080b11]/82 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[linear-gradient(180deg,#7b96ff,#526fff)] shadow-[0_10px_26px_rgba(82,111,255,0.24)]"><HardDrive size={17} /></span>
            TeleStore
          </Link>
          <div className="hidden items-center gap-1 rounded-full border border-border bg-white/[0.025] p-1 text-sm text-muted md:flex">
            <Link to="/features" className="rounded-full px-3 py-1.5 hover:bg-white/[0.055] hover:text-white">Features</Link>
            <Link to="/docs" className="rounded-full px-3 py-1.5 hover:bg-white/[0.055] hover:text-white">Docs</Link>
            <Link to="/pricing" className="rounded-full px-3 py-1.5 hover:bg-white/[0.055] hover:text-white">Pricing</Link>
            <Link to="/contact" className="rounded-full px-3 py-1.5 hover:bg-white/[0.055] hover:text-white">Contact</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
            <Link to="/signup"><Button size="sm">Get started</Button></Link>
          </div>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
