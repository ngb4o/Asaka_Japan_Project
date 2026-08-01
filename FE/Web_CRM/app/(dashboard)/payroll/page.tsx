"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileCardList,
  MobileMetaChip,
  MobileRecordActions,
  MobileRecordCard,
  MobileStatTile,
} from "@/components/ui/mobile-record-card";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManagePayroll, rolesOf } from "@/lib/auth/permissions";
import {
  deletePayroll,
  generatePayroll,
  getPayrollPeriod,
  getPayrollPeriods,
  lockPayroll,
} from "@/lib/api/payroll";
import type { PayrollPeriod } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { formatCurrency } from "@/lib/utils";
import { statusBadgeVariant } from "@/lib/status-badge";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayrollPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const canEdit = canManagePayroll(rolesOf(user));
  const [selected, setSelected] = useState<PayrollPeriod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const isPayrollAction = (id: string, kind: "lock" | "delete") =>
    actionId === `${kind}:${id}`;
  const [period, setPeriod] = useState(currentPeriod());
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPage = useCallback(
    (pageNum: number) => getPayrollPeriods({ page: pageNum, limit: DEFAULT_PAGE_SIZE }),
    []
  );

  const onError = useCallback(
    (err: unknown) => {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được bảng lương"
      );
    },
    [toast]
  );

  const {
    items,
    page,
    total,
    totalPages,
    loading,
    loadingMore,
    hasMore,
    reload,
    refresh,
    loadMore,
    goToPage,
  } = useMobilePagedList<PayrollPeriod>({ fetchPage, onError });

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  async function handleGenerate() {
    setSubmitting(true);
    try {
      const result = await generatePayroll(period);
      toast.success("Đã tạo/cập nhật bảng lương");
      setSelected(result);
      setDialogOpen(true);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Tạo bảng lương thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(item: PayrollPeriod) {
    try {
      const detail = await getPayrollPeriod(item.id);
      setSelected(detail);
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Không mở được bảng lương");
    }
  }

  async function handleLock(item: PayrollPeriod) {
    const ok = await confirm({
      title: "Khóa bảng lương",
      description: `Khóa bảng lương ${item.period}? Sau khi khóa sẽ không chỉnh lại được.`,
      confirmText: "Khóa",
    });
    if (!ok) return;
    setActionId(`lock:${item.id}`);
    try {
      await lockPayroll(item.id);
      toast.success("Đã khóa bảng lương");
      await reload();
      if (selected?.id === item.id) {
        setSelected(await getPayrollPeriod(item.id));
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Khóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(item: PayrollPeriod) {
    const ok = await confirm({
      title: "Xóa bảng lương",
      description: `Xóa bảng lương ${item.period}?`,
      confirmText: "Xóa",
      variant: "danger",
    });
    if (!ok) return;
    setActionId(`delete:${item.id}`);
    try {
      await deletePayroll(item.id);
      toast.success("Đã xóa bảng lương");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.warehouses} />;
  }

  return (
    <div className="min-h-full space-y-0 bg-[var(--color-surface-elevated)] md:min-h-0 md:space-y-6 md:bg-transparent">
      <PageHeader
        title="Bảng lương"
        description={
          canEdit
            ? "Lương cứng + phụ cấp + hoa hồng đơn hoàn tất + hoàn chi phí chuyến"
            : "Xem lương theo tháng của bạn (sau khi kế toán tạo bảng lương)"
        }
        actions={
          canEdit ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="period">Kỳ lương</Label>
              <DateInput
                id="period"
                mode="month"
                value={period}
                onChange={setPeriod}
                clearable={false}
                className="w-[160px]"
              />
            </div>
            <Button onClick={handleGenerate} loading={submitting}>
              <RefreshCw className="h-4 w-4" />
              Tạo / cập nhật
            </Button>
          </div>
          ) : null
        }
        fab={
          canEdit
            ? {
                onClick: handleGenerate,
                label: "Tạo / cập nhật bảng lương",
                loading: submitting,
                icon: <RefreshCw className="h-5 w-5" />,
              }
            : null
        }
      />

      {canEdit ? (
      <div className="bg-[var(--color-surface-elevated)] px-3 py-3 md:hidden">
        <Label htmlFor="period-mobile" className="sr-only">
          Kỳ lương
        </Label>
        <DateInput
          id="period-mobile"
          mode="month"
          value={period}
          onChange={setPeriod}
          clearable={false}
        />
      </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Các kỳ lương</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có bảng lương</p>
          ) : (
            <>
              <MobileInfiniteList
                onRefresh={refresh}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                disabled={loading}
              >
                <div className="flex flex-col gap-3">
                  {items.map((item) => {
                    const net = item.lines.reduce((sum, line) => sum + (line.net || 0), 0);
                    return (
                      <MobileRecordCard key={item.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold tracking-tight text-[var(--color-text-primary)]">
                              {item.period}
                            </p>
                          </div>
                          <Badge
                            variant={statusBadgeVariant(item.status)}
                            className="shrink-0"
                          >
                            {item.status === "locked" ? "Đã khóa" : "Nháp"}
                          </Badge>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {canEdit ? (
                            <MobileStatTile label="Nhân viên">
                              {item.lines.length}
                            </MobileStatTile>
                          ) : (
                            <MobileStatTile label="Họ tên">
                              {item.lines[0]?.employeeName || "—"}
                            </MobileStatTile>
                          )}
                          <MobileStatTile label={canEdit ? "Tổng thực nhận" : "Thực nhận"}>
                            {formatCurrency(net)}
                          </MobileStatTile>
                        </div>

                        <MobileRecordActions>
                          <Button variant="outline" size="sm" onClick={() => openDetail(item)}>
                            Xem
                          </Button>
                          {canEdit && item.status !== "locked" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                loading={isPayrollAction(item.id, "lock")}
                                onClick={() => handleLock(item)}
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                loading={isPayrollAction(item.id, "delete")}
                                onClick={() => handleDelete(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}
                        </MobileRecordActions>
                      </MobileRecordCard>
                    );
                  })}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                    <th className="px-2 py-3 font-medium">Kỳ</th>
                    <th className="px-2 py-3 font-medium">
                      {canEdit ? "Nhân viên" : "Họ tên"}
                    </th>
                    <th className="px-2 py-3 font-medium">
                      {canEdit ? "Tổng thực nhận" : "Thực nhận"}
                    </th>
                    <th className="px-2 py-3 font-medium">Trạng thái</th>
                    <th className="px-2 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const net = item.lines.reduce((sum, line) => sum + (line.net || 0), 0);
                    return (
                      <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                        <td className="px-2 py-3 font-medium">{item.period}</td>
                        <td className="px-2 py-3">
                          {canEdit
                            ? item.lines.length
                            : item.lines[0]?.employeeName || "—"}
                        </td>
                        <td className="px-2 py-3">{formatCurrency(net)}</td>
                        <td className="px-2 py-3">
                          <Badge variant={item.status === "locked" ? "success" : "muted"}>
                            {item.status === "locked" ? "Đã khóa" : "Nháp"}
                          </Badge>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openDetail(item)}>
                              Xem
                            </Button>
                            {canEdit && item.status !== "locked" ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  loading={isPayrollAction(item.id, "lock")}
                                  onClick={() => handleLock(item)}
                                >
                                  <Lock className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  loading={isPayrollAction(item.id, "delete")}
                                  onClick={() => handleDelete(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={DEFAULT_PAGE_SIZE}
            onPageChange={goToPage}
            disabled={loading}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Bảng lương {selected?.period}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3">
              <MobileCardList>
                {selected.lines.map((line) => (
                  <MobileRecordCard key={line.employeeId} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold tracking-tight text-[var(--color-text-primary)]">
                          {line.employeeName}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-[var(--color-text-inverse)]">
                          {line.employeeCode} · HH {line.commissionPercent}%
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-text-secondary)]">
                        {formatCurrency(line.net)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MobileStatTile label="Lương cứng">
                        {formatCurrency(line.baseSalary)}
                      </MobileStatTile>
                      <MobileStatTile label="Phụ cấp">
                        {formatCurrency(line.allowance)}
                      </MobileStatTile>
                      <MobileStatTile label="Doanh số">
                        {formatCurrency(line.salesTotal)}
                      </MobileStatTile>
                      <MobileStatTile label="Hoa hồng">
                        {formatCurrency(line.commission)}
                      </MobileStatTile>
                    </div>

                    {line.tripReimburse ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <MobileMetaChip>
                          Hoàn CT: {formatCurrency(line.tripReimburse)}
                        </MobileMetaChip>
                      </div>
                    ) : null}
                  </MobileRecordCard>
                ))}
              </MobileCardList>

              <div className="crm-table-scroll hidden md:block">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                      <th className="px-2 py-2 font-medium">Nhân viên</th>
                      <th className="px-2 py-2 font-medium text-right">Lương cứng</th>
                      <th className="px-2 py-2 font-medium text-right">Phụ cấp</th>
                      <th className="px-2 py-2 font-medium text-right">Doanh số</th>
                      <th className="px-2 py-2 font-medium text-right">Hoa hồng</th>
                      <th className="px-2 py-2 font-medium text-right">Hoàn CT</th>
                      <th className="px-2 py-2 font-medium text-right">Thực nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((line) => (
                      <tr
                        key={line.employeeId}
                        className="border-b border-[var(--color-border-subtle)]"
                      >
                        <td className="px-2 py-2">
                          <p className="font-medium">{line.employeeName}</p>
                          <p className="text-xs text-[var(--color-text-inverse)]">
                            {line.employeeCode} - HH {line.commissionPercent}%
                          </p>
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(line.baseSalary)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(line.allowance)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(line.salesTotal)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(line.commission)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(line.tripReimburse)}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold">
                          {formatCurrency(line.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
