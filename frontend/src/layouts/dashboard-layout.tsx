import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Bell, BookOpen, ChevronDown, Command, Database, FileUp, Gauge, HardDrive, Home, Image, KeyRound, LogOut, Menu, Plus, Search, Settings, Shield, User, X } from "lucide-react";
import { CommandMenu } from "@/components/navigation/command-menu";
import { Button } from "@/components/ui/button";
import { logoutSession, notifyError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Storage",
    items: [
      { to: "/app", label: "Dashboard", icon: Home },
      { to: "/app/media", label: "Media Library", icon: Image },
      { to: "/app/uploads", label: "Uploads", icon: FileUp },
      { to: "/app/workspaces", label: "Workspaces", icon: Database }
    ]
  },
  {
    label: "Developer",
    items: [
      { to: "/app/api-access", label: "API Access", icon: KeyRound },
      { to: "/app/docs", label: "Documentation", icon: BookOpen },
      { to: "/app/optimization", label: "Optimization", icon: Gauge },
      { to: "/app/analytics", label: "Analytics", icon: BarChart3 }
    ]
  },
  {
    label: "Account",
    items: [
      { to: "/app/profile", label: "Profile", icon: User },
      { to: "/app/settings", label: "Settings", icon: Settings },
      { to: "/admin", label: "Admin", icon: Shield }
    ]
  }
];

const mobileNav = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/media", label: "Files", icon: Image },
  { to: "/app/workspaces", label: "Spaces", icon: Database },
  { to: "/app/api-access", label: "API", icon: KeyRound }
];

export function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const { sidebarOpen, setSidebarOpen, setCommandOpen, requestUpload } = useUiStore();
  const location = useLocation();
  const navigate = useNavigate();
  const crumbs = location.pathname.split("/").filter(Boolean);

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[272px_minmax(0,1fr)] lg:pb-0">
      {sidebarOpen && <button aria-label="Close sidebar overlay" className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-[min(86vw,288px)] overflow-y-auto border-r border-border/80 bg-[#080b11]/95 p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl transition duration-300 lg:sticky lg:top-0 lg:block lg:w-auto lg:shadow-none", sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="mb-5 flex h-12 items-center justify-between">
          <Link to="/app" className="flex min-w-0 items-center gap-3 rounded-md px-2 font-semibold text-white">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[linear-gradient(180deg,#7b96ff,#526fff)] shadow-[0_12px_28px_rgba(82,111,255,0.28)]"><HardDrive size={18} /></span>
            <span className="truncate">TeleStorage</span>
          </Link>
          <button className="focus-ring rounded-md p-2 text-muted hover:bg-white/5 hover:text-white lg:hidden" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <div className="mb-4 rounded-lg border border-border bg-white/[0.035] p-3">
          <p className="text-xs text-muted">Current workspace</p>
          <div className="mt-2 flex items-center justify-between gap-3 text-sm text-white">
            <span className="truncate">Telegram storage</span>
            <ChevronDown size={15} className="text-muted" />
          </div>
        </div>
        <nav className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/app"}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted transition duration-200 hover:bg-white/5.5 hover:text-white",
                        isActive && "bg-white/7.5 text-white shadow-[inset_0_0_0_1px_rgba(148,163,184,0.14)]"
                      )
                    }
                  >
                    <item.icon size={17} /> {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 w-full">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-[#080b11]/82 backdrop-blur-xl">
          <div className="flex h-14 min-w-0 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
            <button className="focus-ring rounded-md p-2 text-muted transition hover:bg-white/5 hover:text-white lg:hidden" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <div className="hidden min-w-0 text-sm text-muted sm:block">
              <span className="text-slate-500">/</span> {crumbs.join(" / ") || "dashboard"}
            </div>
            <button className="focus-ring rounded-md p-2 text-muted transition hover:bg-white/5 hover:text-white md:hidden" onClick={() => setCommandOpen(true)} aria-label="Search"><Search size={19} /></button>
            <button onClick={() => setCommandOpen(true)} className="ml-auto hidden h-10 min-w-80 items-center gap-2 rounded-md border border-border bg-white/[0.035] px-3 text-left text-sm text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition hover:border-slate-500/70 hover:bg-white/5.5 md:flex">
              <Search size={15} /> Search or jump to <span className="ml-auto flex items-center gap-1 rounded border border-border bg-black/20 px-1.5 py-0.5 text-xs"><Command size={12} />K</span>
            </button>
            <Button
              variant="primary"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => {
                requestUpload();
                if (location.pathname !== "/app/media") navigate("/app/media", { state: { openUpload: true } });
              }}
            >
              <FileUp size={15} /> Upload
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Notifications"><Bell size={18} /></Button>
            <div className="ml-auto flex h-10 shrink-0 items-center overflow-hidden rounded-md border border-border bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:ml-0">
              <Link to="/app/profile" className="flex h-full items-center gap-2 px-2.5 text-sm text-white transition hover:bg-white/5.5">
                <span className="grid h-6 w-6 place-items-center rounded bg-accent/15 text-xs text-accent">{(user?.name ?? "U").slice(0, 1).toUpperCase()}</span>
                <span className="hidden max-w-28 truncate sm:block">{user?.name ?? "User"}</span>
              </Link>
              <span className="h-5 w-px bg-border" />
              <Button
                variant="ghost"
                size="icon"
                className="h-full w-10 rounded-none text-muted hover:bg-red-500/10 hover:text-red-200"
                aria-label="Logout"
                title="Logout"
                onClick={() => logoutSession().catch((error) => notifyError(error, "Unable to logout."))}
              >
                <LogOut size={15} />
              </Button>
            </div>
          </div>
        </header>
        <Outlet />
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-[#080b11]/94 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium text-muted transition",
                  isActive && "bg-white/7.5 text-white"
                )
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg bg-accent text-[11px] font-medium text-white shadow-[0_10px_28px_rgba(82,111,255,0.28)]"
            onClick={() => {
              requestUpload();
              if (location.pathname !== "/app/media") navigate("/app/media", { state: { openUpload: true } });
            }}
          >
            <Plus size={18} />
            <span>Upload</span>
          </button>
        </div>
      </nav>
      <CommandMenu />
    </div>
  );
}
