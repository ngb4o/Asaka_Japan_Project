"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, RefreshCw } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileRecordActions,
  MobileRecordCard,
  MobileStatTile,
} from "@/components/ui/mobile-record-card";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { VndInput } from "@/components/ui/vnd-input";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  canManagePayments,
  canViewReceivables,
  rolesOf,
} from "@/lib/auth/permissions";
import { getReceivablesSummary } from "@/lib/api/receivables";
import { getOrders, recordOrderPayment } from "@/lib/api/orders";
import { ApiClientError } from "@/lib/api/client";
import { statusBadgeVariant } from "@/lib/status-badge";
import type { Order, ReceivableDealerSummary, ReceivablesSummary } from "@/lib/types";
import { formatCurrency, formatDateDisplay } from "@/lib/utils";

const PAYMENT_LABELS: Record<Order["paymentStatus"], string> = {
  unpaid: "Chưa thu",
  partial: "Thu một phần",
  paid: "Đã thu",
};

function remainingOf(order: Order) {
  return (
    order.remainingAmount ??
    Math.max(0, (order.total || 0) - (order.paidAmount || 0))
  );
}

export default function ReceivablesPage() {
  const toast = useToast();
  const { user } = useAuth();
  const allowed = canViewReceivables(rolesOf(user));
  const canPay = canManagePayments(rolesOf(user));

  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<ReceivableDealerSummary | null>(null);
  const [debtOrders, setDebtOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getReceivablesSummary({
        q: search.trim() || undefined,
      });
      setSummary(data);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được sổ công nợ"
      );
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [allowed, search, toast]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const loadDebtOrders = useCallback(
    async (dealerId: string) => {
      setOrdersLoading(true);
      try {
        const result = await getOrders({
          dealerId,
          hasDebt: true,
          page: 1,
          limit: 100,
        });
        setDebtOrders(result.items);
      } catch (err) {
        toast.error(
          err instanceof ApiClientError
            ? err.message
            : "Không tải được đơn còn nợ"
        );
        setDebtOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    },
    [toast]
  );

  function openDealer(item: ReceivableDealerSummary) {
    setSelected(item);
    setDetailOpen(true);
    void loadDebtOrders(item.dealerId);
  }

  function openPay(order: Order) {
    setPayingOrder(order);
    setPaymentAmount(remainingOf(order) || "");
    setPaymentNote("");
    setPaymentOpen(true);
  }

  async function handleRecordPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!payingOrder) return;
    const amount = Number(paymentAmount) || 0;
    if (amount <= 0) {
      toast.error("Số tiền phải lớn hơn 0");
      return;
    }
    setSubmitting(true);
    try {
      await recordOrderPayment(payingOrder.id, {
        amount,
        note: paymentNote.trim() || undefined,
      });
      toast.success("Đã ghi nhận thanh toán");
      setPaymentOpen(false);
      setPayingOrder(null);
      if (selected) {
        await loadDebtOrders(selected.dealerId);
      }
      const data = await getReceivablesSummary({
        q: search.trim() || undefined,
      });
      setSummary(data);
      if (selected) {
        const next = data.items.find((item) => item.dealerId === selected.dealerId);
        if (next) setSelected(next);
        else {
          setSelected({
            ...selected,
            debtAmount: 0,
            debtOrderCount: 0,
            paidAmount: 0,
          });
        }
      }
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Ghi nhận thất bại"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!allowed) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Công nợ"
          description="Bạn không có quyền xem sổ công nợ đại lý."
        />
      </div>
    );
  }

  if (loading && !summary) {
    return <PageSkeleton {...PAGE_SKELETONS.receivables} />;
  }

  const totals = summary?.totals;
  const items = summary?.items || [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Công nợ đại lý"
        description="Tổng hợp đơn chưa thu đủ theo từng đại lý"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadSummary()}
            loading={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MobileStatTile label="Tổng còn nợ" valueClassName="text-red-600">
          {formatCurrency(totals?.debtAmount || 0)}
        </MobileStatTile>
        <MobileStatTile label="Đại lý còn nợ">
          {totals?.dealerCount || 0}
        </MobileStatTile>
        <MobileStatTile label="Đơn còn nợ">
          {totals?.debtOrderCount || 0}
        </MobileStatTile>
        <MobileStatTile label="Đã thu (đơn nợ)">
          {formatCurrency(totals?.paidAmount || 0)}
        </MobileStatTile>
      </div>

      <Card className="border-0 bg-transparent shadow-none md:border md:bg-[var(--color-surface-elevated)] md:shadow-[var(--shadow-soft)]">
        <CardHeader
          showOnMobile
          className="gap-3 space-y-0 border-b-0 px-0 max-md:flex max-md:pb-0 sm:flex-row sm:items-center sm:justify-between md:border-b md:px-5"
        >
          <CardTitle className="max-md:hidden">
            Danh sách đại lý ({items.length})
          </CardTitle>
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Tìm tên, SĐT, khu vực…"
            className="w-full sm:max-w-xs"
          />
        </CardHeader>
        <CardContent className="max-md:px-0 max-md:pb-0 max-md:pt-3">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">
              Không có đại lý còn công nợ
            </p>
          ) : (
            <>
              <MobileInfiniteList
                onRefresh={loadSummary}
                onLoadMore={() => {}}
                hasMore={false}
                disabled={loading}
              >
                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <MobileRecordCard key={item.dealerId} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold tracking-tight text-[var(--color-text-primary)]">
                            {item.dealerName}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-[var(--color-text-inverse)]">
                            {[item.contactName, item.phone]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        </div>
                        <Badge variant="danger" className="shrink-0">
                          {item.debtOrderCount} đơn
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <MobileStatTile label="Còn nợ" valueClassName="text-red-600">
                          {formatCurrency(item.debtAmount)}
                        </MobileStatTile>
                        <MobileStatTile label="Đã thu">
                          {formatCurrency(item.paidAmount)}
                        </MobileStatTile>
                      </div>

                      <MobileRecordActions>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 min-w-9"
                          title="Xem đơn nợ"
                          onClick={() => openDealer(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </MobileRecordActions>
                    </MobileRecordCard>
                  ))}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden md:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                      <th className="px-2 py-3 font-medium">Đại lý</th>
                      <th className="px-2 py-3 font-medium">Liên hệ</th>
                      <th className="px-2 py-3 font-medium">Khu vực</th>
                      <th className="px-2 py-3 text-right font-medium">Đơn nợ</th>
                      <th className="px-2 py-3 text-right font-medium">Đã thu</th>
                      <th className="px-2 py-3 text-right font-medium">Còn nợ</th>
                      <th className="px-2 py-3 text-right font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.dealerId}
                        className="border-b border-[var(--color-border-subtle)]"
                      >
                        <td className="px-2 py-3 font-medium">{item.dealerName}</td>
                        <td className="px-2 py-3 text-[var(--color-text-inverse)]">
                          {[item.contactName, item.phone]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                        <td className="px-2 py-3">{item.region || "—"}</td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          {item.debtOrderCount}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          {formatCurrency(item.paidAmount)}
                        </td>
                        <td className="px-2 py-3 text-right font-semibold tabular-nums text-red-600">
                          {formatCurrency(item.debtAmount)}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDealer(item)}
                            >
                              <Eye className="h-4 w-4" />
                              Chi tiết
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Công nợ · {selected?.dealerName || "Đại lý"}
            </DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <MobileStatTile label="Còn nợ" valueClassName="text-red-600">
                  {formatCurrency(selected.debtAmount)}
                </MobileStatTile>
                <MobileStatTile label="Đơn nợ">
                  {selected.debtOrderCount}
                </MobileStatTile>
              </div>

              {ordersLoading ? (
                <div
                  className="space-y-3"
                  aria-busy="true"
                  aria-label="Đang tải đơn"
                >
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              ) : debtOrders.length === 0 ? (
                <p className="text-sm text-[var(--color-text-inverse)]">
                  Không còn đơn nợ
                </p>
              ) : (
                <div className="space-y-3">
                  {debtOrders.map((order) => {
                    const remaining = remainingOf(order);
                    return (
                      <div
                        key={order.id}
                        className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[var(--color-text-primary)]">
                              {order.code}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--color-text-inverse)]">
                              {formatDateDisplay(order.createdAt) || "—"}
                            </p>
                          </div>
                          <Badge variant={statusBadgeVariant(order.paymentStatus)}>
                            {PAYMENT_LABELS[order.paymentStatus] ||
                              order.paymentStatus}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Tổng
                            </p>
                            <p className="font-semibold tabular-nums">
                              {formatCurrency(order.total)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Đã thu
                            </p>
                            <p className="font-semibold tabular-nums text-[var(--color-text-secondary)]">
                              {formatCurrency(order.paidAmount || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Còn nợ
                            </p>
                            <p className="font-semibold tabular-nums text-red-600">
                              {formatCurrency(remaining)}
                            </p>
                          </div>
                        </div>

                        {canPay && remaining > 0 ? (
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPay(order)}
                            >
                              Thu
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi nhận thanh toán {payingOrder?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <p className="text-sm text-[var(--color-text-inverse)]">
              Tổng đơn: {formatCurrency(payingOrder?.total || 0)} — Đã thu:{" "}
              {formatCurrency(payingOrder?.paidAmount || 0)}
            </p>
            <div className="space-y-2">
              <Label htmlFor="recvPayAmount">Số tiền thu thêm</Label>
              <VndInput
                id="recvPayAmount"
                value={paymentAmount}
                onValueChange={setPaymentAmount}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recvPayNote">Ghi chú</Label>
              <Input
                id="recvPayNote"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                Ghi nhận
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
