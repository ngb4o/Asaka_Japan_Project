"use client";

import { motion } from "framer-motion";
import { staggerContainer } from "@/lib/animations";
import { useReducedMotion } from "./useReducedMotion";
import { cn } from "@/lib/utils";

type StaggerChildrenProps = {
  children: React.ReactNode;
  className?: string;
};

export function StaggerChildren({ children, className }: StaggerChildrenProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={staggerContainer}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
