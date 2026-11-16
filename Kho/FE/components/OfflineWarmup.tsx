"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { OFFLINE_ROUTES, prefetchOfflineData } from "@/lib/offline/prefetch";
import { registerAppServiceWorker } from "@/lib/offline/register-sw";

export function OfflineWarmup() {
  const router = useRouter();

  useEffect(() => {
    registerAppServiceWorker();
    for (const href of OFFLINE_ROUTES) router.prefetch(href);
    const start = window.setTimeout(() => void prefetchOfflineData(), 1500);
    const timer = window.setInterval(() => void prefetchOfflineData(), 15 * 60 * 1000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [router]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (navigator.onLine) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("//")) return;
      event.preventDefault();
      window.location.assign(href);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
