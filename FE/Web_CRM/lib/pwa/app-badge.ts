/** Home Screen / dock icon badge (Badging API) */

export async function syncAppBadge(count: number) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0) {
      if (typeof nav.setAppBadge === "function") {
        await nav.setAppBadge(Math.min(count, 99));
      }
      return;
    }
    if (typeof nav.clearAppBadge === "function") {
      await nav.clearAppBadge();
    }
  } catch {
    // Unsupported / permission — ignore
  }
}

export async function clearAppBadge() {
  await syncAppBadge(0);
}
