/** iPhone / iPad (incl. iPadOS desktop UA) */
export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

/** Phone / tablet — used for auto notification permission on app open */
export function isPhoneDevice() {
  if (typeof window === "undefined") return false;
  if (isIosDevice() || isAndroidDevice()) return true;
  return window.matchMedia("(max-width: 1023px)").matches;
}

/** Launched as installed Home Screen / PWA */
export function isInstalledPwa() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

/** iOS Home Screen web app — WebKit safe-area / dvh quirks apply */
export function isIosPwa() {
  return isIosDevice() && isInstalledPwa();
}

/**
 * Standalone iOS: use 100vh (full screen). 100dvh/svh lie on cold start.
 * iOS 26: do not lock a fixed root — caller keeps shell in document flow.
 */
export function syncIosPwaShellExtra() {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  if (!isIosPwa()) {
    root.classList.remove("crm-ios-pwa");
    root.style.removeProperty("--crm-app-height");
    return;
  }

  root.classList.add("crm-ios-pwa");
  root.style.setProperty("--crm-app-height", "100vh");
}

/** iOS 26 pans the visual viewport when the keyboard opens without a fixed root. */
export function resetIosPwaScroll() {
  if (typeof window === "undefined" || !isIosPwa()) return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
