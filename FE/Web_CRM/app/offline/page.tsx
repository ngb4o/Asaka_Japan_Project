"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import {
  StatusHomeButton,
  StatusRetryButton,
  StatusScreen,
} from "@/components/ui/status-screen";
import { useNetworkStatus } from "@/components/providers/NetworkStatusProvider";

export default function OfflinePage() {
  const router = useRouter();
  const { online } = useNetworkStatus();

  useEffect(() => {
    if (online) router.replace("/dashboard");
  }, [online, router]);

  return (
    <StatusScreen
      variant="offline"
      code="Offline"
      title="Bạn đang ngoại tuyến"
      description="Thiết bị chưa kết nối internet. Kiểm tra Wi‑Fi / dữ liệu di động rồi thử lại."
      icon={<WifiOff className="h-7 w-7" aria-hidden />}
      primaryAction={
        <StatusRetryButton
          label="Thử kết nối lại"
          onClick={() => {
            if (navigator.onLine) router.replace("/dashboard");
            else window.location.reload();
          }}
        />
      }
      secondaryAction={<StatusHomeButton />}
    />
  );
}
