const KEY = "crm_return_to";

function isSafePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

export function rememberReturnTo(pathWithSearch: string) {
  if (typeof window === "undefined") return;
  if (!isSafePath(pathWithSearch) || pathWithSearch.startsWith("/login")) return;
  try {
    sessionStorage.setItem(KEY, pathWithSearch);
  } catch {
    // ignore
  }
}

export function consumeReturnTo(fallback = "/dashboard") {
  if (typeof window === "undefined") return fallback;
  try {
    const next = sessionStorage.getItem(KEY) || "";
    sessionStorage.removeItem(KEY);
    if (isSafePath(next) && !next.startsWith("/login")) return next;
  } catch {
    // ignore
  }
  return fallback;
}
