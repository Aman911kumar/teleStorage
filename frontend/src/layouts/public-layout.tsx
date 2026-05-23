import { Link, Outlet } from "react-router-dom";
import { HardDrive, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logoutSession, notifyError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

const links = [
  { to: "/features", label: "Features" },
  { to: "/docs", label: "Docs" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" }
];

export function PublicLayout() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isLoggedIn = Boolean(token && user);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-[#080b11]/82 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:h-16 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[linear-gradient(180deg,#7b96ff,#526fff)] shadow-[0_10px_26px_rgba(82,111,255,0.24)]"><HardDrive size={17} /></span>
            TeleStorage
          </Link>
          <div className="hidden items-center gap-1 rounded-full border border-border bg-white/[0.025] p-1 text-sm text-muted md:flex">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="rounded-full px-3 py-1.5 hover:bg-white/[0.055] hover:text-white">{link.label}</Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <div className="hidden h-10 items-center overflow-hidden rounded-md border border-border bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:flex">
                <Link to="/app" className="flex h-full items-center gap-2 px-3 text-sm font-medium text-white transition hover:bg-white/[0.055]">
                  <span className="grid h-6 w-6 place-items-center rounded bg-accent/15 text-xs text-accent">{(user?.name ?? "U").slice(0, 1).toUpperCase()}</span>
                  <span className="max-w-36 truncate">{user?.name ?? "Dashboard"}</span>
                </Link>
                <span className="h-5 w-px bg-border" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-full rounded-none px-3 text-muted hover:bg-red-500/10 hover:text-red-200"
                  aria-label="Logout"
                  title="Logout"
                  onClick={() => logoutSession().catch((error) => notifyError(error, "Unable to logout."))}
                >
                  <LogOut size={15} />
                </Button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
                <Link to="/signup"><Button size="sm">Get started</Button></Link>
              </div>
            )}
            <Button className="md:hidden" variant="secondary" size="icon" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </nav>
        {menuOpen && (
          <div className="border-t border-border/70 bg-[#080b11]/96 px-3 py-3 md:hidden">
            <div className="grid gap-1">
              {links.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-sm font-medium text-slate-300 hover:bg-white/6 hover:text-white">{link.label}</Link>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {isLoggedIn ? (
                <>
                  <Link to="/app" onClick={() => setMenuOpen(false)}><Button className="w-full" variant="secondary">Dashboard</Button></Link>
                  <Button variant="secondary" onClick={() => logoutSession().catch((error) => notifyError(error, "Unable to logout."))}><LogOut size={16} /> Logout</Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)}><Button className="w-full" variant="secondary">Login</Button></Link>
                  <Link to="/signup" onClick={() => setMenuOpen(false)}><Button className="w-full">Get started</Button></Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
      <Outlet />
    </div>
  );
}
