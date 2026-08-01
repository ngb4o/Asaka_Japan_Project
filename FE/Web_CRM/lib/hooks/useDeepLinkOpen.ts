"use client";

import { useEffect, useRef } from "react";

type UseDeepLinkOpenOptions = {
  /** Primary query key, e.g. `detail` or `id` */
  param?: string;
  /** Also accept these keys (legacy links) */
  fallbackParams?: string[];
  enabled?: boolean;
};

function readDeepLinkId(param: string, fallbackParams: string[]) {
  if (typeof window === "undefined") {
    return { id: null as string | null, key: null as string | null };
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get(param)?.trim()) {
    return { id: params.get(param)!.trim(), key: param };
  }
  for (const key of fallbackParams) {
    const value = params.get(key)?.trim();
    if (value) return { id: value, key };
  }
  return { id: null, key: null };
}

/**
 * Opens a record from URL query (hard reload, soft nav, PWA push).
 * Clears the matched query key after a successful open.
 */
export function useDeepLinkOpen(
  onOpen: (id: string) => void | Promise<void>,
  options?: UseDeepLinkOpenOptions
) {
  const param = options?.param || "id";
  const fallbackParams = options?.fallbackParams || [];
  const fallbackKey = fallbackParams.join(",");
  const enabled = options?.enabled !== false;

  const onOpenRef = useRef(onOpen);
  const handledRef = useRef<string | null>(null);
  const openingRef = useRef(false);

  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const fallbacks = fallbackKey ? fallbackKey.split(",") : [];

    const applyFromUrl = () => {
      const { id, key } = readDeepLinkId(param, fallbacks);

      if (!id || !key) {
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

          const params = new URLSearchParams(window.location.search);
          params.delete(key);
          params.delete(param);
          for (const fallback of fallbacks) params.delete(fallback);

          const qs = params.toString();
          const next =
            window.location.pathname +
            (qs ? `?${qs}` : "") +
            window.location.hash;
          window.history.replaceState(
            window.history.state,
            "",
            next
          );
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
    window.addEventListener("focus", applyFromUrl);

    // Next.js router.push / replace don't fire popstate — patch history
    const { pushState, replaceState } = window.history;
    window.history.pushState = function (...args) {
      const result = pushState.apply(this, args as [unknown, string, string?]);
      queueMicrotask(applyFromUrl);
      return result;
    };
    window.history.replaceState = function (...args) {
      const result = replaceState.apply(this, args as [unknown, string, string?]);
      queueMicrotask(applyFromUrl);
      return result;
    };

    return () => {
      window.removeEventListener("popstate", applyFromUrl);
      window.removeEventListener("focus", applyFromUrl);
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
    };
  }, [enabled, param, fallbackKey]);
}
