"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Lock, RefreshCw, Trash2 } from "lucide-react";
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
import {
  FilterDrawer,
  FilterOptionList,
  FilterTrigger,
} from "@/components/ui/filter-drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { STATUS_OPTIONS } from "@/components/ui/searchable-select";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileMetaChip,
  MobileRecordCard,
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
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import { formatCurrency } from "@/lib/utils";
import { statusBadgeVariant } from "@/lib/status-badge";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const EMPTY_LIST_FILTERS = { status: "" };

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
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);

  const fetchPage = useCallback(
    (pageNum: number) =>
      getPayrollPeriods({
        status: filters.applied.status || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [filters.applied.status]
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
    return <PageSkeleton {...PAGE_SKELETONS.payroll} />;
  }

  return (
    <div className="min-h-full space-y-0 lg:min-h-0 lg:space-y-6">
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

      <div className="flex items-center gap-2 bg-[var(--color-surface-elevated)] px-3 py-3 lg:hidden">
        {canEdit ? (
          <>
            <Label htmlFor="period-mobile" className="sr-only">
              Kỳ lương
            </Label>
            <DateInput
              id="period-mobile"
              mode="month"
              value={period}
              onChange={setPeriod}
              clearable={false}
              className="crm-toolbar-elevated min-w-0 flex-1"
            />
          </>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <FilterTrigger
          open={filters.open}
          activeCount={filters.appliedCount}
          onClick={() => filters.setOpen(true)}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>Các kỳ lương</CardTitle>
          <FilterTrigger
            open={filters.open}
            activeCount={filters.appliedCount}
            onClick={() => filters.setOpen(true)}
            className="max-lg:hidden"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterDrawer
            open={filters.open}
            onOpenChange={filters.setOpen}
            title="Bộ lọc bảng lương"
            onClear={filters.clearDraft}
            onApply={filters.apply}
            draftCount={filters.draftCount}>
            <FilterOptionList
              label="Trạng thái"
              value={filters.draft.status}
              onChange={(value) => filters.setDraftValue("status", value)}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...STATUS_OPTIONS.payroll,
              ]}
            />
          </FilterDrawer>
          {items.length === 0 ? (
            <EmptyState title="Chưa có bảng lương" />
          ) : (
            <div className="space-y-4">
              <MobileInfiniteList
                onRefresh={refresh}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                disabled={loading}>
                <div className="flex flex-col gap-3">
                  {items.map((item) => {
                    const net = item.lines.reduce((sum, line) => sum + (line.net || 0), 0);
                    return (
                      <MobileRecordCard key={item.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                              {item.period}
                            </p>
                            {!canEdit ? (
                              <>
                                <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--color-text-primary)]">
                                  {item.lines[0]?.employeeName || "—"}
                                </p>
                                {item.lines[0]?.employeeCode ? (
                                  <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                                    {item.lines[0].employeeCode}
                                  </p>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                          <Badge
                            variant={statusBadgeVariant(item.status)}
                            className="shrink-0">
                            {item.status === "locked" ? "Đã khóa" : "Nháp"}
                          </Badge>
                        </div>

                        <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                          <div>
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              {canEdit ? "Nhân viên" : "Họ tên"}
                            </p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                              {canEdit
                                ? item.lines.length
                                : item.lines[0]?.employeeName || "—"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              {canEdit ? "Tổng thực nhận" : "Thực nhận"}
                            </p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-secondary)]">
                              {formatCurrency(net)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3.5 flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-w-9"
                            onClick={() => openDetail(item)}
                            title="Xem chi tiết">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && item.status !== "locked" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 min-w-9"
                                title="Khóa bảng lương"
                                loading={isPayrollAction(item.id, "lock")}
                                onClick={() => handleLock(item)}>
                                <Lock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="h-9 min-w-9"
                                title="Xóa"
                                loading={isPayrollAction(item.id, "delete")}
                                onClick={() => handleDelete(item)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </MobileRecordCard>
                    );
                  })}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden lg:block">
              <div className="crm-table-frame">
                <table className="crm-data-table min-w-[720px]">
                <thead>
                  <tr>
                    <th className="font-medium">Kỳ</th>
                    <th className="font-medium">
                      {canEdit ? "Nhân viên" : "Họ tên"}
                    </th>
                    <th className="font-medium">
                      {canEdit ? "Tổng thực nhận" : "Thực nhận"}
                    </th>
                    <th className="font-medium">Trạng thái</th>
                    <th className="text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const net = item.lines.reduce((sum, line) => sum + (line.net || 0), 0);
                    return (
                      <tr key={item.id}>
                        <td className="font-medium">{item.period}</td>
                        <td>
                          {canEdit
                            ? item.lines.length
                            : item.lines[0]?.employeeName || "—"}
                        </td>
                        <td>{formatCurrency(net)}</td>
                        <td>
                          <Badge variant={item.status === "locked" ? "success" : "muted"}>
                            {item.status === "locked" ? "Đã khóa" : "Nháp"}
                          </Badge>
                        </td>
                        <td>
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
                                  title="Khóa bảng lương">
                                  <Lock className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  loading={isPayrollAction(item.id, "delete")}
                                  onClick={() => handleDelete(item)} title="Xóa">
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
            </div>
            </div>
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
              <div className="crm-stagger-list flex flex-col gap-3.5 lg:hidden">
                {selected.lines.map((line) => (
                  <MobileRecordCard key={line.employeeId} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                          {line.employeeCode}
                        </p>
                        <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--color-text-primary)]">
                          {line.employeeName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                          HH {line.commissionPercent}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                      <div>
                        <p className="text-xs text-[var(--color-text-inverse)]">
                          Lương cứng
                        </p>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                          {formatCurrency(line.baseSalary)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[var(--color-text-inverse)]">
                          Thực nhận
                        </p>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-secondary)]">
                          {formatCurrency(line.net)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <MobileMetaChip>
                        Phụ cấp: {formatCurrency(line.allowance)}
                      </MobileMetaChip>
                      <MobileMetaChip>
                        Doanh số: {formatCurrency(line.salesTotal)}
                      </MobileMetaChip>
                      <MobileMetaChip>
                        Hoa hồng: {formatCurrency(line.commission)}
                      </MobileMetaChip>
                      {line.tripReimburse ? (
                        <MobileMetaChip>
                          Hoàn CT: {formatCurrency(line.tripReimburse)}
                        </MobileMetaChip>
                      ) : null}
                    </div>
                  </MobileRecordCard>
                ))}
              </div>

              <div className="crm-table-scroll hidden lg:block">
                <div className="crm-table-frame">
                  <table className="crm-data-table min-w-[800px]">
                  <thead>
                    <tr>
                      <th className="font-medium">Nhân viên</th>
                      <th className="font-medium text-right">Lương cứng</th>
                      <th className="font-medium text-right">Phụ cấp</th>
                      <th className="font-medium text-right">Doanh số</th>
                      <th className="font-medium text-right">Hoa hồng</th>
                      <th className="font-medium text-right">Hoàn CT</th>
                      <th className="font-medium text-right">Thực nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((line) => (
                      <tr key={line.employeeId}>
                        <td>
                          <p className="font-medium">{line.employeeName}</p>
                          <p className="text-xs text-[var(--color-text-inverse)]">
                            {line.employeeCode} - HH {line.commissionPercent}%
                          </p>
                        </td>
                        <td className="text-right">
                          {formatCurrency(line.baseSalary)}
                        </td>
                        <td className="text-right">
                          {formatCurrency(line.allowance)}
                        </td>
                        <td className="text-right">
                          {formatCurrency(line.salesTotal)}
                        </td>
                        <td className="text-right">
                          {formatCurrency(line.commission)}
                        </td>
                        <td className="text-right">
                          {formatCurrency(line.tripReimburse)}
                        </td>
                        <td className="text-right font-semibold">
                          {formatCurrency(line.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
