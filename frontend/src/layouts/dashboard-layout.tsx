import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, Bell, BookOpen, Command, Database, FileUp, Gauge, Home, Image, KeyRound, Menu, Search, Settings, Shield, User } from "lucide-react";
import { CommandMenu } from "@/components/navigation/command-menu";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", label: "Dashboard", icon: Home },
  { to: "/app/media", label: "Media Library", icon: Image },
  { to: "/app/uploads", label: "Uploads", icon: FileUp },
  { to: "/app/workspaces", label: "Workspaces", icon: Database },
  { to: "/app/api-access", label: "API Access", icon: KeyRound },
  { to: "/app/optimization", label: "Optimization", icon: Gauge },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/docs", label: "Documentation", icon: BookOpen },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/settings", label: "Settings", icon: Settings },
  { to: "/admin", label: "Admin", icon: Shield }
];

export function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const { sidebarOpen, setSidebarOpen, setCommandOpen } = useUiStore();
  const location = useLocation();
  const crumbs = location.pathname.split("/").filter(Boolean);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-background p-3 transition lg:sticky lg:top-0 lg:block", sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <Link to="/app" className="mb-6 flex h-12 items-center gap-2 px-2 font-semibold text-white">
          <span className="rounded-md bg-accent p-1.5"><Database size={18} /></span>
          TeleStore
        </Link>
        <nav className="space-y-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/app"} onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-white", isActive && "bg-panel-2 text-white")}>
              <item.icon size={17} /> {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/82 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button className="focus-ring rounded-md p-2 text-muted lg:hidden" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <div className="hidden text-sm text-muted sm:block">{crumbs.join(" / ") || "dashboard"}</div>
            <button onClick={() => setCommandOpen(true)} className="ml-auto hidden h-9 min-w-72 items-center gap-2 rounded-md border border-border bg-panel px-3 text-left text-sm text-muted transition hover:border-slate-600 md:flex">
              <Search size={15} /> Search or jump to <span className="ml-auto flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs"><Command size={12} />K</span>
            </button>
            <Button variant="ghost" size="sm" className="px-2"><Bell size={18} /></Button>
            <div className="rounded-md border border-border bg-panel px-3 py-1.5 text-sm text-white">{user?.name ?? "User"}</div>
          </div>
        </header>
        <Outlet />
      </div>
      <CommandMenu />
    </div>
  );
}
