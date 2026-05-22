import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";

export function AuthLayout() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#06080d] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(86,112,255,0.18),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(34,211,238,0.10),transparent_30%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-[480px]">
        <Outlet />
      </motion.div>
    </main>
  );
}
