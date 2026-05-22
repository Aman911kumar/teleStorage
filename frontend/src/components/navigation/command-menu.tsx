import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { useUiStore } from "@/store/ui-store";

const actions = [
  { label: "Dashboard", path: "/app" },
  { label: "Media Gallery", path: "/app/media" },
  { label: "Workspaces", path: "/app/workspaces" },
  { label: "API Access", path: "/app/api-access" },
  { label: "Optimization", path: "/app/optimization" },
  { label: "Analytics", path: "/app/analytics" },
  { label: "Admin Analytics", path: "/admin" },
  { label: "Settings", path: "/app/settings" }
];

export function CommandMenu() {
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-80 bg-black/60 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="surface mx-auto mt-24 max-w-xl overflow-hidden rounded-xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <Command>
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search size={17} className="text-muted" />
                <Command.Input className="h-14 w-full bg-transparent text-sm text-white outline-none placeholder:text-muted" placeholder="Search pages, actions, files..." autoFocus />
              </div>
              <Command.List className="thin-scrollbar max-h-80 overflow-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-muted">No results found.</Command.Empty>
                {actions.map((action) => (
                  <Command.Item key={action.path} value={action.label} onSelect={() => { navigate(action.path); setOpen(false); }} className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2.5 text-sm text-slate-200 transition data-[selected=true]:bg-white/7.5 data-[selected=true]:text-white">
                    <span>{action.label}</span>
                    <ArrowRight size={14} className="text-muted" />
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
