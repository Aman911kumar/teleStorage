import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "@/store/ui-store";

const actions = [
  { label: "Dashboard", path: "/app" },
  { label: "Media Gallery", path: "/app/media" },
  { label: "Workspaces", path: "/app/workspaces" },
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
        <motion.div className="fixed inset-0 z-[80] bg-black/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="mx-auto mt-24 max-w-xl overflow-hidden rounded-lg border border-border bg-panel shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <Command>
              <Command.Input className="h-12 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted" placeholder="Search pages, actions, files..." autoFocus />
              <Command.List className="max-h-80 overflow-auto p-2">
                <Command.Empty className="px-3 py-8 text-center text-sm text-muted">No results found.</Command.Empty>
                {actions.map((action) => (
                  <Command.Item key={action.path} value={action.label} onSelect={() => { navigate(action.path); setOpen(false); }} className="cursor-pointer rounded-md px-3 py-2 text-sm text-slate-200 data-[selected=true]:bg-panel-2">
                    {action.label}
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
