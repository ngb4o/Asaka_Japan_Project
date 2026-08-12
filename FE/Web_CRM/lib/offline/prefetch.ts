import { getDashboardSummary } from "@/lib/api/dashboard";
import { getDealers } from "@/lib/api/dealers";
import { getLeads } from "@/lib/api/leads";
import { getNotifications } from "@/lib/api/notifications";
import { getOrders } from "@/lib/api/orders";
import { getProducts } from "@/lib/api/products";
import { getReceivablesSummary } from "@/lib/api/receivables";
import { getSuppliers } from "@/lib/api/suppliers";
import { getTrips } from "@/lib/api/trips";
import { getWarehouseStocks } from "@/lib/api/inventory";
import { getWarehouses } from "@/lib/api/warehouses";
import {
  canAccessPath,
  canViewReceivables,
  canViewSuppliers,
  rolesOf,
} from "@/lib/auth/permissions";
import type { UserProfile, UserRole } from "@/lib/types";

const PREFETCH_AT_KEY = "crm_offline_prefetch_at";
const PREFETCH_OK_KEY = "crm_offline_prefetch_ok";
const MIN_INTERVAL_MS = 15 * 60 * 1000;

/** Routes to warm in the SW page cache (HTML shell). */
const SHELL_ROUTES = [
  "/dashboard",
  "/orders",
  "/inventory",
  "/trips",
  "/dealers",
  "/leads",
  "/receivables",
  "/products",
  "/suppliers",
  "/settings",
  "/offline",
] as const;

export type PrefetchResult = {
  ok: number;
  failed: number;
  skipped: boolean;
  at: number;
};

function roleList(user: UserProfile | UserRole[] | null | undefined): UserRole[] {
  if (!user) return [];
  if (Array.isArray(user)) return user;
  return rolesOf(user);
}

export function getLastOfflinePrefetchAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFETCH_AT_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function getLastOfflinePrefetchOk(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFETCH_OK_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function warmServiceWorkerRoutes(paths: string[]) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // Hitting routes lets the SW network-first handler store HTML + triggers static chunk loads.
  await Promise.allSettled(
    paths.map((path) =>
      fetch(path, {
        credentials: "same-origin",
        headers: { Accept: "text/html" },
      }).catch(() => undefined)
    )
  );

  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active;
    if (!worker) return;
    worker.postMessage({ type: "CACHE_URLS", urls: paths });
  } catch {
    // ignore
  }
}

function buildApiTasks(roles: UserRole[]) {
  const tasks: Array<{ label: string; run: () => Promise<unknown> }> = [];

  if (canAccessPath(roles, "/dashboard")) {
    tasks.push({ label: "dashboard", run: () => getDashboardSummary() });
  }

  if (canAccessPath(roles, "/orders")) {
    tasks.push({
      label: "orders",
      run: () => getOrders({ page: 1, limit: 50 }),
    });
    tasks.push({
      label: "dealers-for-orders",
      run: () => getDealers({ page: 1, limit: 100 }),
    });
    tasks.push({
      label: "products-for-orders",
      run: () => getProducts({ page: 1, limit: 100, status: "active" }),
    });
  } else if (canAccessPath(roles, "/dealers")) {
    tasks.push({
      label: "dealers",
      run: () => getDealers({ page: 1, limit: 50 }),
    });
  }

  if (canAccessPath(roles, "/inventory")) {
    tasks.push({
      label: "stocks",
      run: () => getWarehouseStocks({ page: 1, limit: 50 }),
    });
    tasks.push({
      label: "warehouses",
      run: () => getWarehouses({ page: 1, limit: 50 }),
    });
  }

  if (canAccessPath(roles, "/trips")) {
    tasks.push({
      label: "trips",
      run: () => getTrips({ page: 1, limit: 50 }),
    });
  }

  if (canAccessPath(roles, "/leads")) {
    tasks.push({
      label: "leads",
      run: () => getLeads({ page: 1, limit: 50 }),
    });
  }

  if (canViewReceivables(roles) && canAccessPath(roles, "/receivables")) {
    tasks.push({
      label: "receivables",
      run: () => getReceivablesSummary(),
    });
  }

  if (canViewSuppliers(roles) && canAccessPath(roles, "/suppliers")) {
    tasks.push({
      label: "suppliers",
      run: () => getSuppliers({ page: 1, limit: 50 }),
    });
  }

  if (canAccessPath(roles, "/products") && !canAccessPath(roles, "/orders")) {
    tasks.push({
      label: "products",
      run: () => getProducts({ page: 1, limit: 50 }),
    });
  }

  tasks.push({
    label: "notifications",
    run: () => getNotifications(),
  });

  return tasks;
}

function shellPathsForRoles(roles: UserRole[]) {
  return SHELL_ROUTES.filter((path) => {
    if (path === "/offline" || path === "/settings") return true;
    if (path === "/receivables") return canViewReceivables(roles);
    if (path === "/suppliers") return canViewSuppliers(roles);
    return canAccessPath(roles, path);
  });
}

/**
 * Prefetch list APIs into IndexedDB + warm SW page/shell cache.
 * Safe to call often — throttled unless `force`.
 */
export async function prefetchOfflineForUser(
  user: UserProfile | null | undefined,
  options?: { force?: boolean }
): Promise<PrefetchResult> {
  const now = Date.now();
  if (typeof window === "undefined") {
    return { ok: 0, failed: 0, skipped: true, at: now };
  }
  if (!navigator.onLine) {
    return { ok: 0, failed: 0, skipped: true, at: now };
  }

  const roles = roleList(user);
  if (!roles.length) {
    return { ok: 0, failed: 0, skipped: true, at: now };
  }

  if (!options?.force) {
    const last = getLastOfflinePrefetchAt();
    if (last && now - last < MIN_INTERVAL_MS) {
      return { ok: 0, failed: 0, skipped: true, at: last };
    }
  }

  const tasks = buildApiTasks(roles);
  const results = await Promise.allSettled(tasks.map((task) => task.run()));
  let ok = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === "fulfilled") ok += 1;
    else failed += 1;
  }

  void warmServiceWorkerRoutes(shellPathsForRoles(roles));

  try {
    window.localStorage.setItem(PREFETCH_AT_KEY, String(now));
    window.localStorage.setItem(PREFETCH_OK_KEY, String(ok));
  } catch {
    // ignore
  }

  return { ok, failed, skipped: false, at: now };
}
