"use client";

import { useEffect } from "react";
import { syncIosPwaShellExtra } from "@/lib/device";

/** Keep iOS Home Screen PWA shell height in sync after hydration / rotate. */
export function IosPwaViewport() {
  useEffect(() => {
    syncIosPwaShellExtra();

    const onChange = () => syncIosPwaShellExtra();
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    window.visualViewport?.addEventListener("resize", onChange);
    window.visualViewport?.addEventListener("scroll", onChange);

    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", onChange);

    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      window.visualViewport?.removeEventListener("resize", onChange);
      window.visualViewport?.removeEventListener("scroll", onChange);
      mq.removeEventListener?.("change", onChange);
    };
  }, []);

  return null;
}
