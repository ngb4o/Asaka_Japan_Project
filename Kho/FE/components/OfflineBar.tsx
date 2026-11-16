"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { onOfflineCacheHit, readLastCacheSavedAt } from "@/lib/offline/api-cache";

function formatSaved(savedAt: number) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(savedAt);
}

export function OfflineBar() {
  const [online, setOnline] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    setSavedAt(readLastCacheSavedAt());
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const unsubscribe = onOfflineCacheHit((at) => {
      setFromCache(true);
      setSavedAt(at);
    });
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (online) setFromCache(false);
  }, [online]);

  if (online && !fromCache) return null;

  const when = savedAt ? ` lúc ${formatSaved(savedAt)}` : "";

  return (
    <div className="flex shrink-0 items-center gap-2 bg-[#fef3c7] px-3 py-2 text-sm text-[#92400e] print:hidden">
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0 leading-snug">
        {online ? "Đang xem dữ liệu đã lưu" : "Mất mạng. Đang xem dữ liệu đã lưu"}
        {when}.
      </p>
    </div>
  );
}
