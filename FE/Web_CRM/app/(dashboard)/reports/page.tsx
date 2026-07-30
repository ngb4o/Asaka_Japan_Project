"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  ShoppingCart,
  TrendingUp,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangeInput } from "@/components/ui/date-range-input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import {
  OrdersBarChart,
  RankingBarChart,
  RevenueAreaChart,
  StatusPieChart,
} from "@/components/reports/Charts";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canViewReports } from "@/lib/auth/permissions";
import { getSalesReport } from "@/lib/api/dashboard";
import { downloadSalesReportExcel } from "@/lib/export/salesReportExcel";
import type { SalesReport } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { useToast } from "@/components/providers/ToastProvider";
import { cn, formatCurrency } from "@/lib/utils";

const PRESETS = [
  { value: "thisMonth", label: "Tháng này" },
  { value: "lastMonth", label: "Tháng trước" },
  { value: "last3Months", label: "3 tháng" },
  { value: "thisYear", label: "Năm nay" },
  { value: "last12Months", label: "12 tháng" },
  { value: "custom", label: "Tùy chọn" },
] as const;

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Hủy",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
};

export default function ReportsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const allowed = canViewReports(user?.role);
  const [preset, setPreset] = useState<string>("thisMonth");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params =
        preset === "custom" && from && to
          ? { from, to, groupBy: "day" as const }
          : { preset };
      const data = await getSalesReport(params);
      setReport(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Không tải được báo cáo");
    } finally {
      setLoading(false);
    }
  }, [allowed, preset, from, to, toast]);

  useEffect(() => {
    if (preset === "custom" && (!from || !to)) return;
    loadReport();
  }, [loadReport, preset, from, to]);

  const statusPie = useMemo(
    () =>
      (report?.statusBreakdown || []).map((item) => ({
        name: ORDER_STATUS_LABELS[item.status] || item.status,
        value: item.count,
      })),
    [report?.statusBreakdown]
  );

  const topDealerChart = useMemo(
    () =>
      (report?.topDealers || []).slice(0, 8).map((item) => ({
        name: item.dealerName,
        revenue: item.revenue,
        orderCount: item.orderCount,
      })),
    [report?.topDealers]
  );

  const topProductChart = useMemo(
    () =>
      (report?.topProducts || []).slice(0, 8).map((item) => ({
        name: item.productName,
        revenue: item.revenue,
        orderCount: item.quantity,
      })),
    [report?.topProducts]
  );

  if (!allowed) {
    return (
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-8 text-center">
        <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-[var(--color-text-inverse)]">
          Báo cáo doanh số toàn công ty chỉ dành cho Quản trị và Kế toán.
        </p>
      </div>
    );
  }

  if (loading && !report) {
    return <PageSkeleton {...PAGE_SKELETONS.warehouses} />;
  }

  const kpis = report?.kpis;

  async function handleExportExcel() {
    if (!report) {
      toast.warning("Chưa có dữ liệu báo cáo để xuất");
      return;
    }
    try {
      await downloadSalesReportExcel(report);
      toast.success("Đã tải file Excel");
    } catch {
      toast.error("Không xuất được file");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Báo cáo doanh số"
        description="Doanh thu, thanh toán, công nợ, top đại lý / sản phẩm / nhân viên theo kỳ"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExportExcel()}
            disabled={!report || loading}
          >
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={preset === item.value ? "default" : "outline"}
                onClick={() => setPreset(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {preset === "custom" ? (
            <div className="min-w-[260px] space-y-1.5">
              <Label>Từ ngày → Đến ngày</Label>
              <DateRangeInput
                from={from}
                to={to}
                fromLabel="Từ ngày"
                toLabel="Đến ngày"
                placeholder="Chọn khoảng ngày báo cáo"
                onChange={({ from: nextFrom, to: nextTo }) => {
                  setFrom(nextFrom);
                  setTo(nextTo);
                }}
              />
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto md:hidden"
            onClick={() => void handleExportExcel()}
            disabled={!report || loading}
          >
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          title="Doanh số"
          value={kpis?.revenue}
          change={kpis?.revenueChangePercent}
          icon={TrendingUp}
          format="currency"
        />
        <Kpi
          title="Đã thu"
          value={kpis?.paidAmount}
          change={kpis?.paidChangePercent}
          icon={Wallet}
          format="currency"
        />
        <Kpi title="Công nợ" value={kpis?.debt} icon={AlertTriangle} format="currency" />
        <Kpi
          title="Số đơn"
          value={kpis?.orderCount}
          change={kpis?.orderChangePercent}
          icon={ShoppingCart}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--color-text-inverse)]">Đơn hoàn tất</p>
            <p className="mt-1 text-xl font-semibold">{kpis?.completedCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--color-text-inverse)]">Doanh thu hoàn tất</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(kpis?.completedRevenue || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--color-text-inverse)]">Giá trị đơn TB</p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(kpis?.avgOrderValue || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Doanh số & đã thu theo kỳ</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={report?.series || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái đơn</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusPieChart data={statusPie} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Số đơn theo kỳ</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersBarChart data={report?.series || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(report?.paymentBreakdown || []).map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">
                    {PAYMENT_LABELS[item.status] || item.status}
                  </p>
                  <p className="text-xs text-[var(--color-text-inverse)]">
                    {item.count} đơn - GT {formatCurrency(item.total)}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatCurrency(item.paidAmount)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top đại lý</CardTitle>
          </CardHeader>
          <CardContent>
            {topDealerChart.length ? (
              <RankingBarChart data={topDealerChart} />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top sản phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            {topProductChart.length ? (
              <RankingBarChart data={topProductChart} />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankTable
          title="Bảng đại lý"
          headers={["Đại lý", "Đơn", "Doanh số", "Đã thu"]}
          rows={(report?.topDealers || []).map((item) => [
            <div key={`dealer-name-${item.dealerId || item.dealerName}`} className="min-w-0">
              <p className="truncate">{item.dealerName}</p>
              {item.region ? (
                <p className="truncate text-xs font-normal text-[var(--color-text-inverse)]">
                  {item.region}
                </p>
              ) : null}
            </div>,
            String(item.orderCount),
            formatCurrency(item.revenue),
            formatCurrency(item.paidAmount),
          ])}
        />
        <RankTable
          title="Bảng sản phẩm"
          headers={["Sản phẩm", "SL", "Doanh số"]}
          rows={(report?.topProducts || []).map((item) => [
            <span
              key={`product-name-${item.productId || item.productName}`}
              className="line-clamp-2"
            >
              {item.productName}
            </span>,
            String(item.quantity),
            formatCurrency(item.revenue),
          ])}
        />
        <RankTable
          title="Bảng nhân viên"
          headers={["Nhân viên", "Đơn", "Doanh số", "Đã thu"]}
          rows={(report?.topStaff || []).map((item) => [
            <div
              key={`staff-name-${item.userId || item.staffName}`}
              className="min-w-0"
            >
              <p className="truncate">{item.staffName}</p>
              {item.employeeCode ? (
                <p className="truncate text-xs font-normal text-[var(--color-text-inverse)]">
                  {item.employeeCode}
                </p>
              ) : null}
            </div>,
            String(item.orderCount),
            formatCurrency(item.revenue),
            formatCurrency(item.paidAmount),
          ])}
        />
      </div>
    </div>
  );
}

function Empty() {
  return (
    <p className="py-10 text-center text-sm text-[var(--color-text-inverse)]">
      Chưa có dữ liệu trong kỳ
    </p>
  );
}

function ChangeBadge({ value }: { value?: number }) {
  if (value == null) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
        up
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value)}% so với kỳ trước
    </span>
  );
}

function Kpi({
  title,
  value,
  change,
  icon: Icon,
  format,
}: {
  title: string;
  value?: number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  format?: "currency";
}) {
  return (
    <Card>
      <CardHeader className="border-none pb-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[var(--color-text-inverse)]">{title}</p>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]">
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-3">
        <p className="text-2xl font-semibold tracking-tight">
          {format === "currency" ? formatCurrency(value || 0) : value || 0}
        </p>
        <ChangeBadge value={change} />
      </CardContent>
    </Card>
  );
}

function rankTableColumnWidths(columnCount: number): string[] {
  if (columnCount === 4) {
    const numeric = "20.6667%";
    return ["38%", numeric, numeric, numeric];
  }
  if (columnCount === 3) {
    return ["44%", "16%", "40%"];
  }
  const each = `${100 / columnCount}%`;
  return Array.from({ length: columnCount }, () => each);
}

function RankTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  const colWidths = rankTableColumnWidths(headers.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="crm-table-scroll">
            <table className="w-full min-w-[300px] table-fixed text-left text-sm">
              <colgroup>
                {colWidths.map((width, index) => (
                  <col key={`${headers[index]}-${index}`} style={{ width }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                  {headers.map((header, index) => (
                    <th
                      key={header}
                      className={cn(
                        "px-2 py-2 font-medium",
                        index === 0 ? "text-left" : "text-right"
                      )}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-b border-[var(--color-border-subtle)]">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={cn(
                          "px-2 py-2 align-top",
                          cellIndex === 0
                            ? "max-w-0 font-medium"
                            : "whitespace-nowrap text-right tabular-nums text-[var(--color-text-inverse)]"
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
