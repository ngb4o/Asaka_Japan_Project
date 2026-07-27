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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManagePayroll } from "@/lib/auth/permissions";
import {
  deletePayroll,
  generatePayroll,
  getPayrollPeriod,
  getPayrollPeriods,
  lockPayroll,
} from "@/lib/api/payroll";
import type { PayrollPeriod } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE, shouldReloadPreviousPage } from "@/lib/pagination";
import { formatCurrency } from "@/lib/utils";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayrollPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const canEdit = canManagePayroll(user?.role);
  const [items, setItems] = useState<PayrollPeriod[]>([]);
  const [selected, setSelected] = useState<PayrollPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [period, setPeriod] = useState(currentPeriod());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    if (!canEdit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getPayrollPeriods({ page, limit: DEFAULT_PAGE_SIZE });
      setItems(result.items);
      if (shouldReloadPreviousPage(result, page)) {
        setPage(result.totalPages);
        return;
      }
      setPage(result.page);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Không tải được bảng lương");
    } finally {
      setLoading(false);
    }
  }, [page, toast, canEdit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerate() {
    setSubmitting(true);
    try {
      const result = await generatePayroll(period);
      toast.success("Đã tạo/cập nhật bảng lương");
      setSelected(result);
      setDialogOpen(true);
      await loadData();
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
    try {
      await lockPayroll(item.id);
      toast.success("Đã khóa bảng lương");
      await loadData();
      if (selected?.id === item.id) {
        setSelected(await getPayrollPeriod(item.id));
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Khóa thất bại");
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
    try {
      await deletePayroll(item.id);
      toast.success("Đã xóa bảng lương");
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    }
  }

  if (!canEdit) {
    return (
      <div className="space-y-2">
        <PageHeader title="Bảng lương" description="Chỉ kế toán/admin được truy cập." />
      </div>
    );
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.warehouses} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng lương"
        description="Lương cứng + phụ cấp + hoa hồng đơn hoàn tất + hoàn chi phí chuyến"
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="period">Kỳ lương</Label>
              <Input
                id="period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button onClick={handleGenerate} loading={submitting}>
              <RefreshCw className="h-4 w-4" />
              Tạo / cập nhật
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Các kỳ lương</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có bảng lương</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                    <th className="px-2 py-3 font-medium">Kỳ</th>
                    <th className="px-2 py-3 font-medium">Nhân viên</th>
                    <th className="px-2 py-3 font-medium">Tổng thực nhận</th>
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
                        <td className="px-2 py-3">{item.lines.length}</td>
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
                            {item.status !== "locked" ? (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleLock(item)}>
                                  <Lock className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
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
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={DEFAULT_PAGE_SIZE}
            onPageChange={setPage}
            disabled={loading}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bảng lương {selected?.period}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="overflow-x-auto">
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
                    <tr key={line.employeeId} className="border-b border-[var(--color-border-subtle)]">
                      <td className="px-2 py-2">
                        <p className="font-medium">{line.employeeName}</p>
                        <p className="text-xs text-[var(--color-text-inverse)]">
                          {line.employeeCode} - HH {line.commissionPercent}%
                        </p>
                      </td>
                      <td className="px-2 py-2 text-right">{formatCurrency(line.baseSalary)}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(line.allowance)}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(line.salesTotal)}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(line.commission)}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(line.tripReimburse)}</td>
                      <td className="px-2 py-2 text-right font-semibold">
                        {formatCurrency(line.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
