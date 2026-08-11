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
 * WebKit standalone PWA reports innerHeight/100dvh without the home-indicator
 * strip. Measure the missing CSS pixels and expose as --crm-ios-shell-extra.
 * Skip updates while the keyboard is open (visualViewport shrinks).
 */
export function syncIosPwaShellExtra() {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  if (!isIosPwa()) {
    root.classList.remove("crm-ios-pwa");
    root.style.removeProperty("--crm-ios-shell-extra");
    return;
  }

  root.classList.add("crm-ios-pwa");

  const vv = window.visualViewport;
  if (vv && (vv.offsetTop > 1 || window.innerHeight - vv.height > 80)) {
    return;
  }

  const portrait = window.innerHeight >= window.innerWidth;
  const physical = portrait ? window.screen.height : window.screen.width;
  const missing = Math.max(0, Math.round(physical - window.innerHeight));
  if (missing > 0) {
    root.style.setProperty("--crm-ios-shell-extra", `${missing}px`);
  } else {
    root.style.removeProperty("--crm-ios-shell-extra");
  }
}
