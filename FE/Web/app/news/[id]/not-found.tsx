import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewsNotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-24 text-center">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
        Không tìm thấy tin tức
      </h1>
      <p className="mt-2 text-[var(--color-text-inverse)]">
        Bài viết có thể đã bị gỡ hoặc không còn hiển thị.
      </p>
      <Button asChild className="mt-6 bg-[var(--color-text-secondary)] text-white hover:bg-[#016502]">
        <Link href="/#news">Về tin tức</Link>
      </Button>
    </main>
  );
}
