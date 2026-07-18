import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPageRange } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

function getVisiblePages(page: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page]);

  if (page > 1) pages.add(page - 1);
  if (page < totalPages) pages.add(page + 1);

  return Array.from(pages).sort((a, b) => a - b);
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  disabled = false,
  className,
}: PaginationProps) {
  const { from, to } = getPageRange(page, limit, total);
  const visiblePages = getVisiblePages(page, totalPages);

  if (total === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-[var(--color-border-subtle)] pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-sm text-[var(--color-text-inverse)]">
        Hiển thị <span className="font-medium text-[var(--color-text-primary)]">{from}</span>
        {" - "}
        <span className="font-medium text-[var(--color-text-primary)]">{to}</span>
        {" trong tổng số "}
        <span className="font-medium text-[var(--color-text-primary)]">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {visiblePages.map((pageNumber, index) => {
          const previous = visiblePages[index - 1];
          const showEllipsis = previous !== undefined && pageNumber - previous > 1;

          return (
            <span key={pageNumber} className="flex items-center gap-1">
              {showEllipsis && (
                <span className="px-1 text-sm text-[var(--color-text-inverse)]">...</span>
              )}
              <Button
                type="button"
                variant={pageNumber === page ? "default" : "outline"}
                size="sm"
                className="min-w-9"
                disabled={disabled}
                onClick={() => onPageChange(pageNumber)}
                aria-current={pageNumber === page ? "page" : undefined}
              >
                {pageNumber}
              </Button>
            </span>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
