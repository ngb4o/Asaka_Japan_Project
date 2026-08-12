"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CloudOff, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { onOfflineCacheHit } from "@/lib/offline/api-cache";
import {
  listQueuedMutations,
  onMutationQueueChanged,
} from "@/lib/offline/mutation-queue";
import {
  flushOfflineSync,
  onOnlineSync,
} from "@/lib/offline/sync";
import { useToast } from "@/components/providers/ToastProvider";

type NetworkStatusContextValue = {
  online: boolean;
  pendingMutations: number;
  viewingCachedData: boolean;
  lastCacheSavedAt: number | null;
};

const NetworkStatusContext = createContext<NetworkStatusContextValue>({
  online: true,
  pendingMutations: 0,
  viewingCachedData: false,
  lastCacheSavedAt: null,
});

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [online, setOnline] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [viewingCachedData, setViewingCachedData] = useState(false);
  const [lastCacheSavedAt, setLastCacheSavedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refreshQueueCount = useCallback(async () => {
    const items = await listQueuedMutations();
    setPendingMutations(items.length);
  }, []);

  const syncOnline = useCallback(
    async (showToast: boolean) => {
      setOnline(true);
      setViewingCachedData(false);
      setSyncing(true);
      try {
        const result = await flushOfflineSync();
        await refreshQueueCount();
        if (showToast) {
          if (result.flushed > 0) {
            toast.success(
              `Đã đồng bộ ${result.flushed} thao tác đang chờ.`
            );
          } else if (result.failed > 0) {
            toast.error("Đồng bộ một số thao tác thất bại. Sẽ thử lại sau.");
          } else {
            toast.success("Đã kết nối lại — đang cập nhật dữ liệu.");
          }
        }
      } finally {
        setSyncing(false);
      }
    },
    [refreshQueueCount, toast]
  );

  useEffect(() => {
    setMounted(true);
    setOnline(navigator.onLine);
    void refreshQueueCount();

    const onOffline = () => {
      setOnline(false);
    };

    const onOnline = () => {
      void syncOnline(true);
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    const unsubCache = onOfflineCacheHit((savedAt) => {
      setViewingCachedData(true);
      setLastCacheSavedAt(savedAt);
    });
    const unsubQueue = onMutationQueueChanged(() => {
      void refreshQueueCount();
    });
    const unsubSync = onOnlineSync(() => {
      void refreshQueueCount();
    });

    // SW background sync → ask client to flush
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "ASAKA_BG_SYNC") {
        void syncOnline(true);
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      unsubCache();
      unsubQueue();
      unsubSync();
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [refreshQueueCount, syncOnline]);

  // Clear "viewing cache" hint once online again and a bit of time passed
  useEffect(() => {
    if (online && viewingCachedData) {
      const timer = window.setTimeout(() => setViewingCachedData(false), 2500);
      return () => window.clearTimeout(timer);
    }
  }, [online, viewingCachedData]);

  return (
    <NetworkStatusContext.Provider
      value={{
        online: mounted ? online : true,
        pendingMutations,
        viewingCachedData: mounted ? viewingCachedData : false,
        lastCacheSavedAt,
      }}>
      {children}
      {mounted ? (
        <NetworkBanners
          online={online}
          pendingMutations={pendingMutations}
          viewingCachedData={viewingCachedData}
          lastCacheSavedAt={lastCacheSavedAt}
          syncing={syncing}
        />
      ) : null}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  return useContext(NetworkStatusContext);
}

function NetworkBanners({
  online,
  pendingMutations,
  viewingCachedData,
  lastCacheSavedAt,
  syncing,
}: {
  online: boolean;
  pendingMutations: number;
  viewingCachedData: boolean;
  lastCacheSavedAt: number | null;
  syncing: boolean;
}) {
  if (syncing) {
    return (
      <Banner tone="info">
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        <span>Đang đồng bộ dữ liệu…</span>
      </Banner>
    );
  }

  if (!online) {
    return (
      <Banner tone="warning">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Mất kết nối —{" "}
          {viewingCachedData
            ? `đang xem dữ liệu đã lưu${formatCacheAge(lastCacheSavedAt)}`
            : "có thể xem dữ liệu đã tải trước đó"}
          {pendingMutations > 0
            ? ` · ${pendingMutations} thao tác chờ đồng bộ`
            : ""}
        </span>
      </Banner>
    );
  }

  if (viewingCachedData) {
    return (
      <Banner tone="info">
        <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Đang hiển thị bản đã lưu
          {formatCacheAge(lastCacheSavedAt)}
        </span>
      </Banner>
    );
  }

  if (pendingMutations > 0) {
    return (
      <Banner tone="info">
        <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
        <span>{pendingMutations} thao tác đang chờ đồng bộ</span>
      </Banner>
    );
  }

  return null;
}

function Banner({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "warning" | "info";
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-3",
        "pt-[max(0.5rem,env(safe-area-inset-top))]"
      )}>
      <div
        className={cn(
          "pointer-events-auto mt-1 flex max-w-lg items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium shadow-[var(--shadow-elevated)]",
          tone === "warning"
            ? "border border-amber-500/30 bg-amber-50 text-amber-900 dark:border-amber-400/25 dark:bg-amber-950/90 dark:text-amber-100"
            : "border border-sky-500/25 bg-sky-50 text-sky-900 dark:border-sky-400/25 dark:bg-sky-950/90 dark:text-sky-100"
        )}>
        {children}
      </div>
    </div>
  );
}

function formatCacheAge(savedAt: number | null) {
  if (!savedAt) return "";
  const minutes = Math.max(0, Math.round((Date.now() - savedAt) / 60000));
  if (minutes < 1) return " (vừa cập nhật)";
  if (minutes < 60) return ` (${minutes} phút trước)`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return ` (${hours} giờ trước)`;
  return ` (${Math.round(hours / 24)} ngày trước)`;
}
