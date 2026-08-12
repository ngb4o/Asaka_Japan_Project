"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isInstalledPwa, isIosDevice } from "@/lib/device";
import { registerPushServiceWorker } from "@/lib/push/webPush";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallOutcome = "accepted" | "dismissed" | "unavailable";

type PwaInstallContextValue = {
  /** Already running as installed PWA */
  installed: boolean;
  /** Chrome/Edge Android (etc.) deferred install prompt is ready */
  canPrompt: boolean;
  /** iOS Safari — need manual Share → Add to Home Screen */
  isIos: boolean;
  promptInstall: () => Promise<InstallOutcome>;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect(() => {
    const alreadyInstalled = isInstalledPwa();
    setInstalled(alreadyInstalled);
    setIsIos(isIosDevice());

    // SW is required for installability criteria on Chromium.
    if (!alreadyInstalled && "serviceWorker" in navigator) {
      void registerPushServiceWorker().catch(() => {});
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };

    const onDisplayMode = () => {
      setInstalled(isInstalledPwa());
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const mqStandalone = window.matchMedia("(display-mode: standalone)");
    mqStandalone.addEventListener?.("change", onDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mqStandalone.removeEventListener?.("change", onDisplayMode);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferred) return "unavailable";
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") {
        setInstalled(true);
        return "accepted";
      }
      return "dismissed";
    } catch {
      setDeferred(null);
      return "unavailable";
    }
  }, [deferred]);

  return (
    <PwaInstallContext.Provider
      value={{
        installed,
        canPrompt: Boolean(deferred) && !installed,
        isIos,
        promptInstall,
      }}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return ctx;
}
