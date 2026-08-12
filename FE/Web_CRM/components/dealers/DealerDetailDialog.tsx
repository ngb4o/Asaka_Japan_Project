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
import { EmptyState } from "@/components/ui/empty-state";
import { TabSwitcher } from "@/components/ui/tab-switcher";
import {
  MobileMetaChip,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { getOrders } from "@/lib/api/orders";
import { ApiClientError } from "@/lib/api/client";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { statusBadgeVariant } from "@/lib/status-badge";
import type { Dealer, LineItem, Order } from "@/lib/types";
import { cn, formatCurrency, formatDateDisplay } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";
import { CodeText, PhoneLink } from "@/components/ui/smart-text";

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
  const debt = remaining || 0;
  return (
    <MobileRecordCard className="p-4 shadow-none">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
            <CodeText value={code} label="mã đơn" />
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
            {formatDate(date)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant={statusSuccess ? "success" : "muted"}>{statusLabel}</Badge>
          {showPayment && paymentStatus ? (
            <Badge variant={statusBadgeVariant(paymentStatus)}>
              {PAYMENT_LABELS[paymentStatus] || paymentStatus}
            </Badge>
          ) : null}
        </div>
      </div>

      <OrderLineItemsList items={items} showImages={false} />

      <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
        <div>
          <p className="text-xs text-[var(--color-text-inverse)]">Tổng đơn</p>
          <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-secondary)]">
            {formatCurrency(total)}
          </p>
        </div>
        {showPayment ? (
          <div className="text-right">
            <p className="text-xs text-[var(--color-text-inverse)]">Còn nợ</p>
            <p
              className={cn(
                "mt-0.5 text-base font-bold tabular-nums",
                debt > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-[var(--color-text-inverse)]"
              )}>
              {formatCurrency(debt)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MobileMetaChip>Tạm tính: {formatCurrency(subtotal)}</MobileMetaChip>
        {discount > 0 ? (
          <MobileMetaChip>Chiết khấu: {formatCurrency(discount)}</MobileMetaChip>
        ) : null}
        {showPayment ? (
          <MobileMetaChip>
            Đã thu: {formatCurrency(paidAmount || 0)}
          </MobileMetaChip>
        ) : null}
      </div>
    </MobileRecordCard>
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
    <MobileRecordCard className="p-4 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
            {dealer.name}
          </p>
          <p className="mt-1 text-[16px] font-medium leading-snug text-[var(--color-text-primary)]">
            {dealer.contactName || "Chưa có liên hệ"}
          </p>
          {dealer.phone ? (
            <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
              <PhoneLink value={dealer.phone} />
            </p>
          ) : null}
          {dealer.region ? (
            <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
              {dealer.region}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
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

      <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
        <div>
          <p className="text-xs text-[var(--color-text-inverse)]">Tổng đơn</p>
          {showContent ? (
            <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-secondary)]">
              {formatCurrency(orderTotal)}
            </p>
          ) : (
            <Skeleton className="mt-1.5 h-5 w-28" />
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-inverse)]">Còn nợ</p>
          {showContent ? (
            <p
              className={cn(
                "mt-0.5 text-base font-bold tabular-nums",
                debtAmount > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-[var(--color-text-inverse)]"
              )}>
              {formatCurrency(debtAmount)}
            </p>
          ) : (
            <Skeleton className="mt-1.5 ml-auto h-5 w-24" />
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MobileMetaChip>
          Chiết khấu: {dealer.discountPercent || 0}%
        </MobileMetaChip>
        {showContent ? (
          <>
            <MobileMetaChip>{orderCount} đơn</MobileMetaChip>
            <MobileMetaChip>{debtOrderCount} đơn nợ</MobileMetaChip>
          </>
        ) : (
          <Skeleton className="h-7 w-24 rounded-md" />
        )}
      </div>
    </MobileRecordCard>
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
        <EmptyState title={emptyText} size="sm" />
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
