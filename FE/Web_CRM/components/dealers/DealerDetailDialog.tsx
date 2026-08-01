"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TabSwitcher } from "@/components/ui/tab-switcher";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { getOrders } from "@/lib/api/orders";
import { ApiClientError } from "@/lib/api/client";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { statusBadgeVariant } from "@/lib/status-badge";
import type { Dealer, LineItem, Order } from "@/lib/types";
import { formatCurrency, formatDateDisplay } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";

type DealerDetailDialogProps = {
  dealer: Dealer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MOBILE_TABS = ["Thông tin", "Đơn hàng", "Công nợ"] as const;

const ORDER_STATUS: Record<Order["status"], string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const PAYMENT_LABELS: Record<Order["paymentStatus"], string> = {
  unpaid: "Chưa thu",
  partial: "Thu một phần",
  paid: "Đã thu",
};

const TIER_LABELS: Record<Dealer["tier"], string> = {
  standard: "Tiêu chuẩn",
  silver: "Bạc",
  gold: "Vàng",
};

function formatDate(value?: string | null) {
  return formatDateDisplay(value) || "—";
}

function remainingOf(order: Order) {
  return (
    order.remainingAmount ??
    Math.max(0, (order.total || 0) - (order.paidAmount || 0))
  );
}

function isDebtOrder(order: Order) {
  return (
    order.status !== "cancelled" &&
    (order.paymentStatus === "unpaid" || order.paymentStatus === "partial") &&
    remainingOf(order) > 0
  );
}

function DocumentCard({
  code,
  statusLabel,
  statusSuccess,
  paymentStatus,
  date,
  subtotal,
  discount,
  total,
  paidAmount,
  remaining,
  items,
  showPayment,
}: {
  code: string;
  statusLabel: string;
  statusSuccess?: boolean;
  paymentStatus?: Order["paymentStatus"];
  date: string;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount?: number;
  remaining?: number;
  items: LineItem[];
  showPayment?: boolean;
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
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge variant={statusSuccess ? "success" : "muted"}>{statusLabel}</Badge>
          {showPayment && paymentStatus ? (
            <Badge variant={statusBadgeVariant(paymentStatus)}>
              {PAYMENT_LABELS[paymentStatus] || paymentStatus}
            </Badge>
          ) : null}
        </div>
      </div>

      <OrderLineItemsList items={items} />

      <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-[var(--color-text-inverse)]">
        <span>Tạm tính: {formatCurrency(subtotal)}</span>
        {discount > 0 ? <span>Chiết khấu: {formatCurrency(discount)}</span> : null}
        <span className="font-semibold text-[var(--color-text-secondary)]">
          Tổng: {formatCurrency(total)}
        </span>
      </div>

      {showPayment ? (
        <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-border-subtle)] pt-3 text-sm">
          <div>
            <p className="text-xs text-[var(--color-text-inverse)]">Đã thu</p>
            <p className="font-semibold tabular-nums text-[var(--color-text-secondary)]">
              {formatCurrency(paidAmount || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-inverse)]">Còn nợ</p>
            <p className="font-semibold tabular-nums text-red-600">
              {formatCurrency(remaining || 0)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DealerInfoCard({
  dealer,
  showContent,
  orderCount,
  orderTotal,
  debtAmount,
  debtOrderCount,
}: {
  dealer: Dealer;
  showContent: boolean;
  orderCount: number;
  orderTotal: number;
  debtAmount: number;
  debtOrderCount: number;
}) {
  return (
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
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
          <p className="text-xs text-[var(--color-text-inverse)]">Chiết khấu</p>
          <p className="mt-1 font-semibold">{dealer.discountPercent || 0}%</p>
        </div>
        <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
          <p className="text-xs text-[var(--color-text-inverse)]">Đơn hàng</p>
          {showContent ? (
            <p className="mt-1 font-semibold">
              {orderCount} - {formatCurrency(orderTotal)}
            </p>
          ) : (
            <Skeleton className="mt-2 h-5 w-32" />
          )}
        </div>
        <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
          <p className="text-xs text-[var(--color-text-inverse)]">Còn nợ</p>
          {showContent ? (
            <p className="mt-1 font-semibold tabular-nums text-red-600">
              {formatCurrency(debtAmount)}
            </p>
          ) : (
            <Skeleton className="mt-2 h-5 w-28" />
          )}
        </div>
        <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
          <p className="text-xs text-[var(--color-text-inverse)]">Đơn còn nợ</p>
          {showContent ? (
            <p className="mt-1 font-semibold">{debtOrderCount}</p>
          ) : (
            <Skeleton className="mt-2 h-5 w-12" />
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersSection({
  showContent,
  orders,
  title,
  emptyText,
  showPayment,
}: {
  showContent: boolean;
  orders: Order[];
  title: string;
  emptyText: string;
  showPayment?: boolean;
}) {
  if (!showContent) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Đang tải đơn hàng">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
        {title} ({orders.length})
      </h4>
      {orders.length === 0 ? (
        <p className="text-sm text-[var(--color-text-inverse)]">{emptyText}</p>
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
              paymentStatus={order.paymentStatus}
              date={order.createdAt}
              subtotal={order.subtotal}
              discount={order.discount}
              total={order.total}
              paidAmount={order.paidAmount}
              remaining={remainingOf(order)}
              items={order.items || []}
              showPayment={showPayment}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function DealerDetailDialog({
  dealer,
  open,
  onOpenChange,
}: DealerDetailDialogProps) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadedDealerId, setLoadedDealerId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMobileTab(0);
      return;
    }
    setMobileTab(0);
  }, [open, dealer?.id]);

  useEffect(() => {
    if (!open || !dealer) {
      setOrders([]);
      setLoadedDealerId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const dealerId = dealer.id;

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
  const debtOrders = useMemo(() => orders.filter(isDebtOrder), [orders]);
  const debtAmount = debtOrders.reduce((sum, item) => sum + remainingOf(item), 0);

  const showInfoPanel = !isMobile || mobileTab === 0;
  const showOrdersPanel = !isMobile || mobileTab === 1;
  const showDebtPanel = isMobile && mobileTab === 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết đại lý</DialogTitle>
        </DialogHeader>

        {dealer ? (
          <div className="space-y-4">
            {isMobile ? (
              <TabSwitcher
                tabs={[...MOBILE_TABS]}
                selectedIndex={mobileTab}
                onTabSelected={setMobileTab}
              />
            ) : null}

            {showInfoPanel ? (
              <DealerInfoCard
                dealer={dealer}
                showContent={showContent}
                orderCount={orders.length}
                orderTotal={orderTotal}
                debtAmount={debtAmount}
                debtOrderCount={debtOrders.length}
              />
            ) : null}

            {showOrdersPanel ? (
              <OrdersSection
                showContent={showContent}
                orders={orders}
                title="Đơn hàng"
                emptyText="Chưa có đơn hàng gắn với đại lý này"
                showPayment
              />
            ) : null}

            {showDebtPanel ? (
              <OrdersSection
                showContent={showContent}
                orders={debtOrders}
                title="Công nợ"
                emptyText="Không còn công nợ"
                showPayment
              />
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
