import { Link, Outlet } from "react-router-dom";
import { HardDrive, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutSession, notifyError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export function PublicLayout() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isLoggedIn = Boolean(token && user);

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
            {isLoggedIn ? (
              <div className="flex h-10 items-center overflow-hidden rounded-md border border-border bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
              <>
                <Link to="/login"><Button variant="ghost" size="sm">Login</Button></Link>
                <Link to="/signup"><Button size="sm">Get started</Button></Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
