"use client";

import { useEffect } from "react";
import { TriangleAlert } from "@/components/ui/icons";
import {
  StatusHomeButton,
  StatusRetryButton,
  StatusScreen,
} from "@/components/ui/status-screen";

/** Errors inside authenticated dashboard shell */
export default function DashboardErrorPage({
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
      fullPage={false}
      hideBrand
      variant="error"
      code="Lỗi trang"
      title="Không tải được nội dung"
      description={
        error.message?.trim()
          ? error.message
          : "Có lỗi khi hiển thị trang này. Thử lại hoặc quay về tổng quan."
      }
      icon={<TriangleAlert className="h-7 w-7" aria-hidden />}
      primaryAction={<StatusRetryButton onClick={reset} />}
      secondaryAction={<StatusHomeButton label="Về tổng quan" />}
    />
  );
}
