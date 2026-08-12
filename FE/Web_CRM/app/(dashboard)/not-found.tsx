import { FileQuestion } from "lucide-react";
import {
  StatusHomeButton,
  StatusScreen,
} from "@/components/ui/status-screen";

export default function DashboardNotFoundPage() {
  return (
    <StatusScreen
      fullPage={false}
      hideBrand
      variant="not-found"
      code="404"
      title="Không tìm thấy trang"
      description="Trang trong hệ thống không tồn tại hoặc bạn không có quyền truy cập."
      icon={<FileQuestion className="h-7 w-7" aria-hidden />}
      primaryAction={<StatusHomeButton label="Về tổng quan" />}
    />
  );
}
