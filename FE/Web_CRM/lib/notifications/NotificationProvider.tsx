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
} from "@/lib/api/notifications";
import type { AppNotification, NotificationSummary } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";

type NotificationContextValue = {
  unreadCount: number;
  counts: NotificationSummary["counts"];
  items: AppNotification[];
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const EMPTY_COUNTS: NotificationSummary["counts"] = {
  leads: 0,
  dealers: 0,
  orders: 0,
  stock: 0,
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

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

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();

    const timer = window.setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      unreadCount,
      counts,
      items,
      loading,
      refresh,
      markAllRead,
    }),
    [unreadCount, counts, items, loading, refresh, markAllRead]
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
