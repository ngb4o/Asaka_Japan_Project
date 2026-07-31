/** iPhone / iPad (incl. iPadOS desktop UA) */
export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
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

/** Read env(safe-area-inset-bottom) in px (0 if WebKit under-reports). */
export function readSafeAreaInsetBottom(): number {
  if (typeof document === "undefined") return 0;
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)";
  document.documentElement.appendChild(el);
  const value = parseFloat(getComputedStyle(el).paddingBottom) || 0;
  el.remove();
  return value;
}

/**
 * iOS PWA only: mark html + set CSS vars for shell/nav.
 * WebKit often excludes bottom safe-area from 100dvh / inset:0, and on some
 * iOS versions env(safe-area-inset-bottom) returns 0.
 *
 * @see https://stackoverflow.com/questions/79902310
 * @see https://bugs.webkit.org/show_bug.cgi?id=254868
 */
export function syncIosPwaViewport() {
  if (typeof document === "undefined") return () => {};

  const root = document.documentElement;

  const apply = () => {
    const iosPwa = isIosPwa();
    root.classList.toggle("crm-ios-pwa", iosPwa);

    if (!iosPwa) {
      root.style.removeProperty("--crm-ios-bottom-gap");
      return;
    }

    const envInset = readSafeAreaInsetBottom();
    // Home-indicator floor when env() lies (seen on newer iOS standalone)
    const floor = 34;
    const gap = Math.max(envInset, floor);
    root.style.setProperty("--crm-ios-bottom-gap", `${gap}px`);
  };

  apply();

  const onResize = () => apply();
  window.addEventListener("resize", onResize);
  window.visualViewport?.addEventListener("resize", onResize);
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener?.("change", apply);

  return () => {
    window.removeEventListener("resize", onResize);
    window.visualViewport?.removeEventListener("resize", onResize);
    mq.removeEventListener?.("change", apply);
    root.classList.remove("crm-ios-pwa");
    root.style.removeProperty("--crm-ios-bottom-gap");
  };
}
