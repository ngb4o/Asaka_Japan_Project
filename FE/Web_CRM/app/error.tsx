"use client";

import { useEffect } from "react";
import { TriangleAlert } from "@/components/ui/icons";
import {
  StatusHomeButton,
  StatusRetryButton,
  StatusScreen,
} from "@/components/ui/status-screen";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      variant="error"
      code="Lỗi hệ thống"
      title="Đã xảy ra sự cố"
      description={
        error.message?.trim()
          ? error.message
          : "Không thể hiển thị trang này. Thử lại hoặc quay về trang chủ."
      }
      icon={<TriangleAlert className="h-7 w-7" aria-hidden />}
      primaryAction={<StatusRetryButton onClick={reset} />}
      secondaryAction={<StatusHomeButton />}
    />
  );
}
