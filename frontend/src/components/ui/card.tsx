import { motion } from "framer-motion";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type CardProps = Omit<ComponentProps<typeof motion.div>, "initial" | "whileInView" | "viewport" | "transition">;

export function Card({ className, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.28 }}
      className={cn(
        "surface rounded-lg text-slate-100 transition-colors duration-200",
        className
      )}
      {...props}
    />
  );
}
