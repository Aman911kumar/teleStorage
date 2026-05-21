import { Link, Outlet } from "react-router-dom";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicLayout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/86 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="rounded-md bg-accent p-1.5"><Database size={18} /></span>
            TeleStore
          </Link>
          <div className="hidden items-center gap-5 text-sm text-muted md:flex">
            <Link to="/features" className="hover:text-white">Features</Link>
            <Link to="/docs" className="hover:text-white">Docs</Link>
            <Link to="/pricing" className="hover:text-white">Pricing</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
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
