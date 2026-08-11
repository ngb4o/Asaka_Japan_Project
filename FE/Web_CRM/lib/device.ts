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
  if (!isIosDevice()) {
    root.classList.remove("crm-ios-pwa");
    root.style.removeProperty("--crm-app-height");
    return;
  }
  /* display-mode can flake; keep the pre-paint tag if it already matched. */
  if (!isInstalledPwa() && !root.classList.contains("crm-ios-pwa")) return;

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

/** True when the pre-paint script (or sync) tagged the document as iOS Home Screen. */
export function isIosPwaDom() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("crm-ios-pwa");
}

/**
 * `fixed; inset:0` clips to the lying viewport on iOS 18/26 PWA.
 * Fill the 100vh body (percentage, not `vh` — `vh` on a shifted absolute box overflows and gets clipped).
 */
export function iosPwaOverlayStyle(): {
  position: "absolute";
  top: 0;
  left: 0;
  width: "100%";
  height: "100%";
} | undefined {
  if (!isIosPwaDom()) return undefined;
  return {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  };
}

/**
 * Stretch a portaled overlay so it covers the real screen.
 * iOS 18 insets `position:absolute` by the safe area; iOS 26 clips `position:fixed`.
 * Measure the leftover band and extend into it (html/body overflow is unlocked while the sheet is open).
 */
export function fitIosPwaOverlay(el: HTMLElement): () => void {
  if (!isIosPwaDom()) return () => {};

  const apply = () => {
    const screenH = document.documentElement.clientHeight;
    el.style.setProperty("position", "absolute", "important");
    el.style.setProperty("left", "0px", "important");
    el.style.setProperty("right", "auto", "important");
    el.style.setProperty("bottom", "auto", "important");
    el.style.setProperty("width", "100%", "important");
    el.style.setProperty("top", "0px", "important");
    el.style.setProperty("height", "100%", "important");

    const first = el.getBoundingClientRect();
    el.style.setProperty("top", `${-first.top}px`, "important");
    el.style.setProperty("height", `${screenH}px`, "important");

    const second = el.getBoundingClientRect();
    const remain =
      Math.max(0, second.top) + Math.max(0, screenH - second.bottom);
    el.style.setProperty("--crm-ios-bottom-gap", `${remain}px`);
  };

  apply();
  requestAnimationFrame(apply);

  const vv = window.visualViewport;
  vv?.addEventListener("resize", apply);
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", apply);

  return () => {
    vv?.removeEventListener("resize", apply);
    window.removeEventListener("resize", apply);
    window.removeEventListener("orientationchange", apply);
  };
}

/** `dvh`/`svh` under-report height in iOS standalone; `vh` matches the real screen. */
export function iosPwaLength(value: string) {
  if (typeof document === "undefined" || !isIosPwaDom()) return value;
  return value.replaceAll("dvh", "vh").replaceAll("svh", "vh");
}
