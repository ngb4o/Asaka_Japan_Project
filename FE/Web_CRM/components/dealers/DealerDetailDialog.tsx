"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrders } from "@/lib/api/orders";
import { ApiClientError } from "@/lib/api/client";
import type { Dealer, LineItem, Order } from "@/lib/types";
import { formatCurrency, formatDateDisplay } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";

type DealerDetailDialogProps = {
  dealer: Dealer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ORDER_STATUS: Record<Order["status"], string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const TIER_LABELS: Record<Dealer["tier"], string> = {
  standard: "Tiêu chuẩn",
  silver: "Bạc",
  gold: "Vàng",
};

function formatDate(value?: string | null) {
  return formatDateDisplay(value) || "—";
}

function LineItemsTable({ items }: { items: LineItem[] }) {
  if (!items.length) {
    return (
      <p className="text-xs text-[var(--color-text-inverse)]">Chưa có sản phẩm</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border-subtle)]">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="bg-[var(--color-surface-muted)] text-[var(--color-text-inverse)]">
            <th className="px-3 py-2 font-medium">Sản phẩm</th>
            <th className="px-3 py-2 font-medium text-right">SL</th>
            <th className="px-3 py-2 font-medium text-right">Đơn giá</th>
            <th className="px-3 py-2 font-medium text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={`${item.productId}-${index}`}
              className="border-t border-[var(--color-border-subtle)]"
            >
              <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">
                {item.productName || "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(item.unitPrice)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">
                {formatCurrency(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentCard({
  code,
  statusLabel,
  statusSuccess,
  date,
  subtotal,
  discount,
  total,
  items,
}: {
  code: string;
  statusLabel: string;
  statusSuccess?: boolean;
  date: string;
  subtotal: number;
  discount: number;
  total: number;
  items: LineItem[];
}) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--color-text-primary)]">{code}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-inverse)]">
            {formatDate(date)}
          </p>
        </div>
        <Badge variant={statusSuccess ? "success" : "muted"}>{statusLabel}</Badge>
      </div>

      <LineItemsTable items={items} />

      <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-[var(--color-text-inverse)]">
        <span>Tạm tính: {formatCurrency(subtotal)}</span>
        {discount > 0 ? <span>Chiết khấu: {formatCurrency(discount)}</span> : null}
        <span className="font-semibold text-[var(--color-text-primary)]">
          Tổng: {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

export function DealerDetailDialog({
  dealer,
  open,
  onOpenChange,
}: DealerDetailDialogProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadedDealerId, setLoadedDealerId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !dealer) {
      setOrders([]);
      setLoadedDealerId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const dealerId = dealer.id;

    // Clear previous dealer's data immediately so UI shows loading, not stale orders
    setOrders([]);
    setLoadedDealerId(null);
    setLoading(true);

    async function loadHistory() {
      try {
        const ordersResult = await getOrders({
          dealerId,
          page: 1,
          limit: 50,
        });
        if (cancelled) return;
        setOrders(ordersResult.items);
        setLoadedDealerId(dealerId);
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof ApiClientError
            ? err.message
            : "Không tải được lịch sử giao dịch"
        );
        setOrders([]);
        setLoadedDealerId(dealerId);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [open, dealer, toast]);

  const showContent = Boolean(dealer) && !loading && loadedDealerId === dealer?.id;
  const orderTotal = orders.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết đại lý</DialogTitle>
        </DialogHeader>

        {dealer ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {dealer.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                    {[dealer.contactName, dealer.phone].filter(Boolean).join(" - ") ||
                      "Chưa có liên hệ"}
                  </p>
                  {dealer.region ? (
                    <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                      Khu vực: {dealer.region}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="muted">{TIER_LABELS[dealer.tier]}</Badge>
                  <Badge variant={dealer.status === "active" ? "success" : "muted"}>
                    {dealer.status === "active"
                      ? "Hoạt động"
                      : dealer.status === "pending"
                        ? "Chờ duyệt"
                        : "Ngưng"}
                  </Badge>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
                  <p className="text-xs text-[var(--color-text-inverse)]">Chiết khấu</p>
                  <p className="mt-1 font-semibold">{dealer.discountPercent || 0}%</p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
                  <p className="text-xs text-[var(--color-text-inverse)]">Đơn hàng</p>
                  {showContent ? (
                    <p className="mt-1 font-semibold">
                      {orders.length} - {formatCurrency(orderTotal)}
                    </p>
                  ) : (
                    <Skeleton className="mt-2 h-5 w-32" />
                  )}
                </div>
              </div>
            </div>

            {!showContent ? (
              <div className="space-y-3" aria-busy="true" aria-label="Đang tải lịch sử">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : (
              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Đơn hàng ({orders.length})
                </h4>
                {orders.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-inverse)]">
                    Chưa có đơn hàng gắn với đại lý này
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <DocumentCard
                        key={order.id}
                        code={order.code}
                        statusLabel={ORDER_STATUS[order.status]}
                        statusSuccess={
                          order.status === "completed" || order.status === "confirmed"
                        }
                        date={order.createdAt}
                        subtotal={order.subtotal}
                        discount={order.discount}
                        total={order.total}
                        items={order.items || []}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
