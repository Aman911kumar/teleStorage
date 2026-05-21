import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";

export function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Outlet />
      </motion.div>
    </main>
  );
}
