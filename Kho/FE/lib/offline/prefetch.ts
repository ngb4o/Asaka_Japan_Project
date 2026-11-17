import {
  listDrivers,
  listElectricProposals,
  listExportSlips,
  listItems,
  listMovements,
  listOfficeProposals,
  listOils,
  listOngDiaProposals,
  listPhucVinhProposals,
  listProposals,
  listRentalProposals,
  listTires,
  listTireProposals,
  listUtilityProposals,
  listViettelProposals,
  listWeldProposals,
  listAdvanceProposals,
  listPaymentRequests,
} from "@/lib/api";

const PREFETCH_AT_KEY = "kho_offline_prefetch_at";
const MIN_INTERVAL_MS = 15 * 60 * 1000;
const PAGE_CACHE = "kho-pages-v1";
const MAX_PAGES = 40;

export const OFFLINE_ROUTES = [
  "/",
  "/kho",
  "/lop",
  "/dau",
  "/drivers",
  "/phieu",
  "/phieu/xuat-vat-tu",
  "/phieu/de-xuat-thanh-toan",
  "/phieu/lam-lop-xe",
  "/phieu/sua-dien-xe",
  "/phieu/vat-tu-phuc-vinh",
  "/phieu/vat-tu-van-phong",
  "/phieu/thue-xe",
  "/phieu/ong-dia",
  "/phieu/han-xe",
  "/phieu/tam-ung",
  "/phieu/thanh-toan",
  "/phieu/gui-hang-viettel",
  "/phieu/dien-nuoc-vp",
];

export function clearOfflinePrefetchStamp() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFETCH_AT_KEY);
  } catch {
    // ignore
  }
}

async function prefetchPaged(load: (page: number) => Promise<{ totalPages: number }>) {
  const first = await load(1);
  const pages = Math.min(Math.max(first.totalPages || 1, 1), MAX_PAGES);
  for (let page = 2; page <= pages; page += 1) {
    await load(page);
  }
}

export async function warmOfflinePages() {
  if (typeof window === "undefined" || !("caches" in window) || !navigator.onLine) return;
  try {
    const cache = await caches.open(PAGE_CACHE);
    await Promise.all(
      OFFLINE_ROUTES.map(async (path) => {
        const response = await fetch(path, {
          credentials: "same-origin",
          headers: { Accept: "text/html" },
        });
        if (!response.ok) return;
        const href = new URL(path, window.location.origin).href;
        await cache.put(path, response.clone());
        await cache.put(href, response.clone());
      })
    );
  } catch {
    // The service worker also fills this cache while the app is open.
  }

  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "CACHE_URLS", urls: OFFLINE_ROUTES });
  } catch {
    // ignore
  }
}

/** Save the lists each screen asks for, so a later offline open hits the same URL. */
export async function prefetchOfflineData() {
  if (typeof window === "undefined" || !navigator.onLine) return;
  let last = 0;
  try {
    last = Number(window.localStorage.getItem(PREFETCH_AT_KEY) || 0);
  } catch {
    last = 0;
  }
  if (Number.isFinite(last) && Date.now() - last < MIN_INTERVAL_MS) {
    void warmOfflinePages();
    return;
  }

  try {
    await warmOfflinePages();
    await prefetchPaged((page) => listItems({ page, limit: 12 }));
    await prefetchPaged((page) => listMovements({ page, limit: 20 }));
    await prefetchPaged((page) => listDrivers({ page, limit: 20 }));
    await listDrivers({ limit: 100 });
    await listDrivers({ limit: 500 });
    await prefetchPaged((page) => listTires({ page, limit: 500 }));
    await listOils();
    await Promise.all([
      listExportSlips(),
      listProposals(),
      listTireProposals(),
      listElectricProposals(),
      listPhucVinhProposals(),
      listOfficeProposals(),
      listRentalProposals(),
      listOngDiaProposals(),
      listWeldProposals(),
      listAdvanceProposals(),
      listPaymentRequests(),
      listViettelProposals(),
      listUtilityProposals(),
    ]);
    window.localStorage.setItem(PREFETCH_AT_KEY, String(Date.now()));
  } catch {
    // A partial save is still readable. The next open tries again.
  }
}
