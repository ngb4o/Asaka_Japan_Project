"use client";

import { useEffect } from "react";
import { resetIosPwaScroll, syncIosPwaShellExtra } from "@/lib/device";

/** Keep iOS Home Screen PWA height on 100vh (iOS 18 + 26). */
export function IosPwaViewport() {
  useEffect(() => {
    syncIosPwaShellExtra();

    const onChange = () => syncIosPwaShellExtra();
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    window.addEventListener("pageshow", onChange);

    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", onChange);

    const onFocus = () => {
      resetIosPwaScroll();
      requestAnimationFrame(resetIosPwaScroll);
    };
    window.addEventListener("focusin", onFocus);
    window.addEventListener("focusout", onFocus);

    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      window.removeEventListener("pageshow", onChange);
      mq.removeEventListener?.("change", onChange);
      window.removeEventListener("focusin", onFocus);
      window.removeEventListener("focusout", onFocus);
    };
  }, []);

  return null;
}
