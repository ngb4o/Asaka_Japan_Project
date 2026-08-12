"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import type { AppNotification, NotificationSummary } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import {
  autoEnableWebPushOnAppOpen,
  disableWebPush,
  enableWebPush,
  getPushBlockReason,
  isPushSupported,
  refreshPushStatus,
  registerPushServiceWorker,
  requestTestPush,
} from "@/lib/push/webPush";
import { syncAppBadge } from "@/lib/pwa/app-badge";

type PushUiState = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  enabled: boolean;
  busy: boolean;
  blockReason: string | null;
};

type NotificationContextValue = {
  unreadCount: number;
  counts: NotificationSummary["counts"];
  items: AppNotification[];
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  push: PushUiState;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
  testPush: () => Promise<{ sent: number; total: number }>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const EMPTY_COUNTS: NotificationSummary["counts"] = {
  leads: 0,
  dealers: 0,
  orders: 0,
  stock: 0,
  trips: 0,
};

const DEFAULT_PUSH: PushUiState = {
  supported: false,
  permission: "unsupported",
  enabled: false,
  busy: false,
  blockReason: null,
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [push, setPush] = useState<PushUiState>(DEFAULT_PUSH);

  const refresh = useCallback(async () => {
    try {
      const result = await getNotifications();
      setUnreadCount(result.unreadCount);
      setCounts(result.counts);
      setItems(result.items);
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 401) return;
    } finally {
      setLoading(false);
    }
  }, []);

  const syncPush = useCallback(async () => {
    const blockReason = getPushBlockReason();
    if (blockReason) {
      setPush({
        supported: false,
        permission: "unsupported",
        enabled: false,
        busy: false,
        blockReason,
      });
      return;
    }

    const status = await refreshPushStatus();
    setPush({
      supported: status.supported,
      permission: status.permission,
      enabled: Boolean(status.localSubscribed),
      busy: false,
      blockReason: null,
    });
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    await refresh();
  }, [refresh]);

  const markRead = useCallback(
    async (id: string) => {
      if (!id) return;

      let markedType: AppNotification["type"] | null = null;

      setItems((prev) => {
        const target = prev.find((item) => item.id === id);
        if (!target?.unread) return prev;
        markedType = target.type;
        return prev.map((item) =>
          item.id === id ? { ...item, unread: false } : item
        );
      });

      if (markedType) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setCounts((prev) => {
          const next = { ...prev };
          if (markedType === "lead" || markedType === "dealer_lead") {
            next.leads = Math.max(0, next.leads - 1);
          } else if (markedType === "dealer") {
            next.dealers = Math.max(0, next.dealers - 1);
          } else if (markedType === "order" || markedType === "payment") {
            next.orders = Math.max(0, next.orders - 1);
          } else if (markedType === "stock") {
            next.stock = Math.max(0, next.stock - 1);
          } else if (markedType === "trip") {
            next.trips = Math.max(0, (next.trips || 0) - 1);
          }
          return next;
        });
      }

      try {
        await markNotificationRead(id);
      } catch (err) {
        if (err instanceof ApiClientError && err.statusCode === 401) return;
        await refresh();
      }
    },
    [refresh]
  );

  const enablePush = useCallback(async () => {
    setPush((prev) => ({ ...prev, busy: true }));
    try {
      await enableWebPush();
      await syncPush();
    } catch (err) {
      await syncPush();
      throw err;
    }
  }, [syncPush]);

  const disablePush = useCallback(async () => {
    setPush((prev) => ({ ...prev, busy: true }));
    try {
      await disableWebPush();
      await syncPush();
    } catch (err) {
      await syncPush();
      throw err;
    }
  }, [syncPush]);

  const testPush = useCallback(async () => {
    setPush((prev) => ({ ...prev, busy: true }));
    try {
      const result = await requestTestPush();
      return { sent: result.sent ?? 0, total: result.total ?? 0 };
    } finally {
      setPush((prev) => ({ ...prev, busy: false }));
      await syncPush();
    }
  }, [syncPush]);

  useEffect(() => {
    void syncAppBadge(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    refresh();
    void syncPush();

    if (isPushSupported()) {
      void registerPushServiceWorker().catch(() => {});
    }

    // Phone: xin quyền hệ thống + đăng ký push khi vào app (không cần bấm Bật)
    const autoTimer = window.setTimeout(() => {
      void autoEnableWebPushOnAppOpen()
        .then(() => syncPush())
        .catch(() => {
          void syncPush();
        });
    }, 900);

    const timer = window.setInterval(refresh, 60_000);
    const onFocus = () => {
      void refresh();
      void syncPush();
    };
    window.addEventListener("focus", onFocus);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "PUSH_NAVIGATE" && typeof event.data.url === "string") {
        const target = event.data.url as string;
        try {
          const next = new URL(target, window.location.origin);
          const current = new URL(window.location.href);
          if (
            next.origin === current.origin &&
            next.pathname === current.pathname &&
            next.search === current.search
          ) {
            return;
          }
          // Same origin deep link — full navigation so page hooks see ?id=
          window.location.assign(next.pathname + next.search + next.hash);
        } catch {
          window.location.assign(target);
        }
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.clearTimeout(autoTimer);
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [refresh, syncPush]);

  const value = useMemo(
    () => ({
      unreadCount,
      counts,
      items,
      loading,
      refresh,
      markAllRead,
      markRead,
      push,
      enablePush,
      disablePush,
      testPush,
    }),
    [
      unreadCount,
      counts,
      items,
      loading,
      refresh,
      markAllRead,
      markRead,
      push,
      enablePush,
      disablePush,
      testPush,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
