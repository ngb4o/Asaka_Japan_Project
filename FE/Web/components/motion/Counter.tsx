"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "framer-motion";
import { useReducedMotion } from "./useReducedMotion";
import { cn } from "@/lib/utils";

type CounterProps = {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
};

export function Counter({ value, suffix = "", duration = 2, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(prefersReducedMotion ? value : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }

    if (!isInView) return;

    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [isInView, value, duration, prefersReducedMotion]);

  const formatted =
    value >= 1000 ? display.toLocaleString("vi-VN") : display.toString();

  return (
    <span ref={ref} className={cn(className)}>
      {formatted}
      {suffix}
    </span>
  );
}
