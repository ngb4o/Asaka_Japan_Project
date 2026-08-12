"use client";

import { WifiOff } from "lucide-react";
import {
  StatusRetryButton,
  StatusScreen,
} from "@/components/ui/status-screen";

/** Inline panel when a page fails to load due to network / API */
export function NetworkErrorState({
  title = "Không kết nối được",
  description = "Máy chủ không phản hồi hoặc thiết bị đang ngoại tuyến. Kiểm tra mạng rồi thử lại.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <StatusScreen
      fullPage={false}
      hideBrand
      variant="network"
      code="Mạng"
      title={title}
      description={description}
      icon={<WifiOff className="h-7 w-7" aria-hidden />}
      primaryAction={
        onRetry ? <StatusRetryButton onClick={onRetry} /> : undefined
      }
    />
  );
}
