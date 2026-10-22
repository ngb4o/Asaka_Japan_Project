"use client";

import { Download, Share, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "kho-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosDevice() {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isInstalledPwa() {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

export function PwaInstallBanner() {
  const [installed, setInstalled] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const alreadyInstalled = isInstalledPwa();
    setInstalled(alreadyInstalled);
    setIsIos(isIosDevice());
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");

    if (!alreadyInstalled && process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {
      setDeferred(null);
    } finally {
      setInstalling(false);
    }
  }, [deferred]);

  if (installed || dismissed) return null;

  return (
    <div className="shrink-0 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-3 lg:hidden">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">Cài đặt ứng dụng</p>
        <button
          type="button"
          aria-label="Ẩn hướng dẫn cài đặt"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-inverse)] hover:bg-white"
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {deferred ? (
        <>
          <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
            Thêm Kho hàng vào màn hình chính để mở như ứng dụng.
          </p>
          <button
            type="button"
            disabled={installing}
            onClick={() => void promptInstall()}
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {installing ? "Đang cài..." : "Cài đặt ứng dụng"}
          </button>
        </>
      ) : isIos ? (
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-[var(--color-text-inverse)]">
          <li>
            Mở trang này bằng <strong className="text-[var(--color-text-primary)]">Safari</strong>
          </li>
          <li className="flex flex-wrap items-center gap-1">
            Bấm nút <Share className="inline h-4 w-4" /> <strong className="text-[var(--color-text-primary)]">Chia sẻ</strong>
          </li>
          <li>
            Chọn <strong className="text-[var(--color-text-primary)]">Thêm vào Màn hình chính</strong>
          </li>
        </ol>
      ) : (
        <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
          Mở menu Chrome hoặc Edge, rồi chọn <strong className="text-[var(--color-text-primary)]">Cài đặt ứng dụng</strong> hoặc{" "}
          <strong className="text-[var(--color-text-primary)]">Thêm vào màn hình chính</strong>.
        </p>
      )}
    </div>
  );
}
