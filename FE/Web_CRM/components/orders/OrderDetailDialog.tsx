"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TabSwitcher } from "@/components/ui/tab-switcher";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { ApiClientError } from "@/lib/api/client";
import { getOrderAudits } from "@/lib/api/orders";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { Order, OrderAudit, OrderAuditAction } from "@/lib/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canViewProfit, rolesOf } from "@/lib/auth/permissions";
import { cn, formatCurrency, formatDateDisplay } from "@/lib/utils";
import { statusBadgeVariant } from "@/lib/status-badge";
import { useToast } from "@/components/providers/ToastProvider";

type OrderDetailDialogProps = {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (order: Order) => void;
};

const MOBILE_TABS = ["Chi tiết", "Nhật ký"] as const;

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const PAYMENT_LABELS: Record<Order["paymentStatus"], string> = {
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
};

const AUDIT_ACTION_LABELS: Record<OrderAuditAction, string> = {
  created: "Tạo đơn",
  status_changed: "Đổi trạng thái",
  confirmed_exported: "Xác nhận & xuất kho",
  cancelled: "Hủy đơn",
  payment_recorded: "Ghi nhận thanh toán",
  deleted: "Xóa đơn",
};

const AUDIT_DOT_CLASS: Record<OrderAuditAction, string> = {
  created: "bg-emerald-500 ring-emerald-500/25",
  confirmed_exported: "bg-[var(--color-text-secondary)] ring-[var(--color-text-secondary)]/25",
  status_changed: "bg-sky-500 ring-sky-500/25",
  cancelled: "bg-red-500 ring-red-500/25",
  payment_recorded: "bg-amber-500 ring-amber-500/25",
  deleted: "bg-[var(--color-text-inverse)] ring-[var(--color-text-inverse)]/20",
};

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  if (value == null || value === "") return null;
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-inverse)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)] whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}

function formatShippingRange(
  shippingDate?: string | null,
  deliveredAt?: string | null
) {
  const from = formatDateDisplay(shippingDate);
  const to = formatDateDisplay(deliveredAt);
  if (from && to) return `${from}   ->   ${to}`;
  if (from) return from;
  if (to) return to;
  return "";
}

function formatAuditTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(value?: unknown) {
  if (typeof value !== "string") return "";
  return STATUS_LABELS[value as Order["status"]] || value;
}

function paymentLabel(value?: unknown) {
  if (typeof value !== "string") return "";
  return PAYMENT_LABELS[value as Order["paymentStatus"]] || value;
}

function auditDetail(item: OrderAudit): string {
  const meta = item.meta || {};
  switch (item.action) {
    case "created":
      return meta.total != null
        ? `Tổng ${formatCurrency(Number(meta.total) || 0)}`
        : "";
    case "confirmed_exported":
    case "status_changed": {
      const from = statusLabel(meta.fromStatus);
      const to = statusLabel(meta.toStatus);
      if (from && to) return `${from} → ${to}`;
      return to || from;
    }
    case "cancelled":
      return meta.restoredInventory
        ? "Đã hoàn kho"
        : statusLabel(meta.fromStatus);
    case "payment_recorded": {
      const parts: string[] = [];
      if (meta.amount != null) {
        parts.push(`+${formatCurrency(Number(meta.amount) || 0)}`);
      } else if (meta.fromPaidAmount != null && meta.toPaidAmount != null) {
        parts.push(
          `${formatCurrency(Number(meta.fromPaidAmount) || 0)} → ${formatCurrency(Number(meta.toPaidAmount) || 0)}`
        );
      }
      const payStatus = paymentLabel(meta.paymentStatus);
      if (payStatus) parts.push(payStatus);
      if (typeof meta.note === "string" && meta.note.trim()) {
        parts.push(meta.note.trim());
      }
      return parts.join(" · ");
    }
    case "deleted":
      return meta.total != null
        ? `Tổng ${formatCurrency(Number(meta.total) || 0)}`
        : "";
    default:
      return "";
  }
}

function OrderAuditTimeline({
  audits,
  loading,
  emptyMessage = "Chưa có nhật ký.",
}: {
  audits: OrderAudit[];
  loading: boolean;
  emptyMessage?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (audits.length === 0) {
    return <EmptyState title={emptyMessage} size="sm" />;
  }

  return (
    <ol className="relative m-0 list-none space-y-0 p-0">
      {audits.map((item, index) => {
        const detail = auditDetail(item);
        const isLast = index === audits.length - 1;
        const isFirst = index === 0;
        const dotClass =
          AUDIT_DOT_CLASS[item.action] ||
          "bg-[var(--color-text-inverse)] ring-[var(--color-text-inverse)]/20";

        return (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Rail + node */}
            <div className="relative flex w-4 shrink-0 flex-col items-center">
              {!isLast ? (
                <span
                  aria-hidden
                  className="absolute top-4 bottom-0 w-px bg-[var(--color-border-subtle)]"
                />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "relative z-[1] mt-1.5 size-2.5 shrink-0 rounded-full ring-4",
                  isFirst && "size-3",
                  dotClass
                )}
              />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 rounded-lg bg-[var(--color-surface-muted)]/70 px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {AUDIT_ACTION_LABELS[item.action] || item.action}
                </p>
                <p className="text-xs tabular-nums text-[var(--color-text-inverse)]">
                  {formatAuditTime(item.createdAt)}
                </p>
              </div>
              <p className="mt-0.5 text-xs text-[var(--color-text-inverse)]">
                {item.actorName}
              </p>
              {detail ? (
                <p className="mt-0.5 text-sm leading-snug text-[var(--color-text-secondary)]">
                  {detail}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onEdit,
}: OrderDetailDialogProps) {
  const toast = useToast();
  const { user } = useAuth();
  const showProfit = canViewProfit(rolesOf(user));
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState(0);
  const [audits, setAudits] = useState<OrderAudit[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMobileTab(0);
      return;
    }
    setMobileTab(0);
  }, [open, order?.id]);

  useEffect(() => {
    if (!open || !order?.id) {
      setAudits([]);
      setLoadedOrderId(null);
      setAuditsLoading(false);
      return;
    }

    let cancelled = false;
    const orderId = order.id;

    setAudits([]);
    setLoadedOrderId(null);
    setAuditsLoading(true);

    async function loadAudits() {
      try {
        const result = await getOrderAudits(orderId);
        if (cancelled) return;
        setAudits(result.items || []);
        setLoadedOrderId(orderId);
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof ApiClientError
            ? err.message
            : "Không tải được lịch sử đơn hàng"
        );
        setAudits([]);
        setLoadedOrderId(orderId);
      } finally {
        if (!cancelled) setAuditsLoading(false);
      }
    }

    loadAudits();
    return () => {
      cancelled = true;
    };
    // order object is refreshed after openDetail(); only re-fetch when id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is stable
  }, [open, order?.id]);

  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const paid = order.paidAmount || 0;
  const remaining =
    order.remainingAmount ?? Math.max(0, (order.total || 0) - paid);
  const deliveryNames =
    order.deliveryEmployeeNames?.filter(Boolean).join(", ") ||
    order.deliveryEmployeeName ||
    "";
  const showAudits = !auditsLoading && loadedOrderId === order.id;
  const hasAuditEntries = showAudits && audits.length > 0;
  const showDetailPanel = !isMobile || mobileTab === 0;
  const showAuditPanel = isMobile ? mobileTab === 1 : hasAuditEntries || auditsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết đơn hàng</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {isMobile ? (
            <TabSwitcher
              tabs={[...MOBILE_TABS]}
              selectedIndex={mobileTab}
              onTabSelected={setMobileTab}
            />
          ) : null}

          {showDetailPanel ? (
            <>
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                      {order.code}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-text-inverse)]">
                      Tạo: {formatDateDisplay(order.createdAt) || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusBadgeVariant(order.status)}>
                      {STATUS_LABELS[order.status]}
                    </Badge>
                    <Badge
                      variant={statusBadgeVariant(order.paymentStatus || "unpaid")}
                    >
                      {PAYMENT_LABELS[order.paymentStatus || "unpaid"]}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2.5">
                    <p className="text-xs text-[var(--color-text-inverse)]">
                      Tổng đơn
                    </p>
                    <p className="mt-1 font-bold tabular-nums text-[var(--color-text-secondary)]">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2.5">
                    <p className="text-xs text-[var(--color-text-inverse)]">
                      Đã thu
                    </p>
                    <p className="mt-1 font-bold tabular-nums">
                      {formatCurrency(paid)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2.5">
                    <p className="text-xs text-[var(--color-text-inverse)]">
                      Còn nợ
                    </p>
                    <p
                      className={cn(
                        "mt-1 font-bold tabular-nums",
                        remaining > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-[var(--color-text-inverse)]"
                      )}
                    >
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                </div>
              </div>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Khách hàng / Đại lý
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Người nhận"
                    value={order.shippingContactName || order.customerName}
                  />
                  <Field
                    label="SĐT"
                    value={order.shippingPhone || order.customerPhone}
                  />
                  <Field label="Email" value={order.customerEmail} />
                  <Field label="Đại lý" value={order.dealerName} />
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Sản phẩm
                </h4>
                <OrderLineItemsList items={order.items || []} />
                <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm text-[var(--color-text-inverse)]">
                  <span>Tạm tính: {formatCurrency(order.subtotal)}</span>
                  {order.discount > 0 ? (
                    <span>Chiết khấu: {formatCurrency(order.discount)}</span>
                  ) : null}
                  {order.shippingFee > 0 ? (
                    <span>Phí ship: {formatCurrency(order.shippingFee)}</span>
                  ) : null}
                  <span className="font-semibold text-[var(--color-text-secondary)]">
                    Tổng: {formatCurrency(order.total)}
                  </span>
                </div>
                {showProfit ? (
                  <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-sm">
                    <span className="text-[var(--color-text-inverse)]">
                      Giá vốn: {formatCurrency(order.costTotal || 0)}
                    </span>
                    <span
                      className={cn(
                        "font-semibold",
                        (order.grossProfit || 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      Lãi gộp: {formatCurrency(order.grossProfit || 0)}
                    </span>
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Giao hàng
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Kho xuất" value={order.warehouseName} />
                  <Field label="Người giao" value={deliveryNames} />
                  <Field label="Chuyến" value={order.tripCode} />
                  <Field label="Đơn vị VC" value={order.carrier} />
                  <Field label="Mã vận chuyển" value={order.trackingCode} />
                  <Field
                    label="Ngày giao"
                    value={formatShippingRange(
                      order.shippingDate,
                      order.deliveredAt
                    )}
                    className="col-span-2"
                  />
                  <Field
                    label="Địa chỉ"
                    value={order.shippingAddress}
                    className="col-span-2"
                  />
                  <Field
                    label="Ghi chú giao hàng"
                    value={order.shippingNote}
                    className="col-span-2"
                  />
                </div>
              </section>

              {(order.note || order.paymentNote) && (
                <section className="space-y-3">
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Ghi chú
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ghi chú đơn" value={order.note} />
                    <Field label="Ghi chú thanh toán" value={order.paymentNote} />
                  </div>
                </section>
              )}
            </>
          ) : null}

          {showAuditPanel ? (
            <section className="space-y-3">
              {!isMobile ? (
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Nhật ký
                </h4>
              ) : null}
              <OrderAuditTimeline
                audits={showAudits ? audits : []}
                loading={auditsLoading || !showAudits}
              />
            </section>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            {showDetailPanel && onEdit ? (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onEdit(order);
                }}
              >
                Sửa đơn
              </Button>
            ) : null}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
