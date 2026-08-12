import { FileQuestion } from "lucide-react";
import {
  StatusHomeButton,
  StatusScreen,
} from "@/components/ui/status-screen";

export default function NotFoundPage() {
  return (
    <StatusScreen
      variant="not-found"
      code="404"
      title="Không tìm thấy trang"
      description="Đường dẫn không tồn tại hoặc đã bị di chuyển. Kiểm tra lại URL hoặc quay về trang chủ."
      icon={<FileQuestion className="h-7 w-7" aria-hidden />}
      primaryAction={<StatusHomeButton />}
    />
  );
}
