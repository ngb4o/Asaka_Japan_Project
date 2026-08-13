import { cn, formatCurrency } from "@/lib/utils";

type PaymentSnapshotProps = {
  total?: number | null;
  paid?: number | null;
  remaining?: number | null;
};

export function PaymentSnapshot({
  total = 0,
  paid = 0,
  remaining,
}: PaymentSnapshotProps) {
  const orderTotal = total || 0;
  const paidAmount = paid || 0;
  const debt =
    remaining ?? Math.max(0, orderTotal - paidAmount);

  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-3 py-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-[var(--color-text-inverse)]">Tổng đơn</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--color-text-secondary)] sm:text-base">
            {formatCurrency(orderTotal)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[var(--color-text-inverse)]">Đã thu</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-[var(--color-text-primary)] sm:text-base">
            {formatCurrency(paidAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-inverse)]">Còn nợ</p>
          <p
            className={cn(
              "mt-0.5 text-sm font-bold tabular-nums sm:text-base",
              debt > 0
                ? "text-red-600 dark:text-red-400"
                : "text-[var(--color-text-inverse)]"
            )}>
            {formatCurrency(debt)}
          </p>
        </div>
      </div>
    </div>
  );
}
