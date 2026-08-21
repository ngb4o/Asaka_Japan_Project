"use client";

import { useEffect, useState } from "react";

/** Match Tailwind `lg` breakpoint (1024px). Returns undefined until mounted to avoid hydration mismatch. */
export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [breakpoint]);

  return isMobile;
}
