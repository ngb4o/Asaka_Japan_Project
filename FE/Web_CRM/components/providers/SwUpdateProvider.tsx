"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { registerPushServiceWorker } from "@/lib/push/webPush";

const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Detects a waiting Service Worker and prompts the user to reload.
 * First install (no controller yet) activates automatically.
 */
export function SwUpdateProvider({ children }: { children: ReactNode }) {
  const [updateReady, setUpdateReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const refreshingRef = useRef(false);

  const activateWaiting = useCallback(() => {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    setApplying(true);
    waiting.postMessage({ type: "SKIP_WAITING" });
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    let checkTimer: number | null = null;

    const onControllerChange = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    };

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      void registrationRef.current?.update().catch(() => {});
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );
    document.addEventListener("visibilitychange", onVisibility);

    const trackWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state !== "installed") return;
        if (navigator.serviceWorker.controller) {
          setUpdateReady(true);
        } else {
          worker.postMessage({ type: "SKIP_WAITING" });
        }
      });
    };

    const watchRegistration = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;

      if (registration.waiting) {
        if (navigator.serviceWorker.controller) {
          setUpdateReady(true);
        } else {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }

      trackWorker(registration.installing);

      registration.addEventListener("updatefound", () => {
        trackWorker(registration.installing);
      });
    };

    void (async () => {
      try {
        const registration = await registerPushServiceWorker();
        if (cancelled || !registration) return;
        watchRegistration(registration);
        checkTimer = window.setInterval(() => {
          void registration.update().catch(() => {});
        }, UPDATE_CHECK_MS);
      } catch {
        // SW unavailable (e.g. insecure HTTP LAN)
      }
    })();

    return () => {
      cancelled = true;
      if (checkTimer) window.clearInterval(checkTimer);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      {children}
      {updateReady ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "pointer-events-none fixed inset-x-0 top-0 z-[101] flex justify-center px-3",
            "pt-[max(0.5rem,env(safe-area-inset-top))]"
          )}>
          <div className="pointer-events-auto mt-1 flex max-w-lg items-center gap-2 rounded-xl border border-[var(--color-text-secondary)]/25 bg-[var(--color-surface-elevated)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] shadow-[var(--shadow-elevated)]">
            <RefreshCw
              className={cn("h-4 w-4 shrink-0", applying && "animate-spin")}
              aria-hidden
            />
            <span className="min-w-0 flex-1">Có bản mới của ứng dụng</span>
            <button
              type="button"
              disabled={applying}
              onClick={activateWaiting}
              className="shrink-0 rounded-lg bg-[var(--color-text-secondary)] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60">
              {applying ? "Đang tải…" : "Tải lại"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
