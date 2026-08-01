"use client";

import { useEffect, useRef } from "react";

/**
 * Reads `?id=` (or custom param) once when present,
 * calls onOpen(id), then strips the query param from the address bar.
 */
export function useDeepLinkOpen(
  onOpen: (id: string) => void | Promise<void>,
  options?: {
    param?: string;
    enabled?: boolean;
  }
) {
  const param = options?.param || "id";
  const enabled = options?.enabled !== false;
  const onOpenRef = useRef(onOpen);
  const handledRef = useRef<string | null>(null);
  const openingRef = useRef(false);

  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const applyFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get(param)?.trim();

      if (!id) {
        handledRef.current = null;
        return;
      }
      if (openingRef.current) return;
      if (handledRef.current === id) return;

      handledRef.current = id;
      openingRef.current = true;

      void (async () => {
        try {
          await onOpenRef.current(id);
          params.delete(param);
          const qs = params.toString();
          const next =
            window.location.pathname +
            (qs ? `?${qs}` : "") +
            window.location.hash;
          window.history.replaceState(null, "", next);
          handledRef.current = null;
        } catch {
          handledRef.current = null;
        } finally {
          openingRef.current = false;
        }
      })();
    };

    applyFromUrl();

    window.addEventListener("popstate", applyFromUrl);
    // PWA push may call client.navigate without remounting React
    window.addEventListener("focus", applyFromUrl);
    return () => {
      window.removeEventListener("popstate", applyFromUrl);
      window.removeEventListener("focus", applyFromUrl);
    };
  }, [enabled, param]);
}
