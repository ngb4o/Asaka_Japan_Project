"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Package,
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
import { EmptyState } from "@/components/ui/empty-state";
import { ReportsPageSkeleton } from "@/components/ui/page-skeleton";
import {
  OrdersBarChart,
  RankingBarChart,
  RevenueAreaChart,
  StatusPieChart,
} from "@/components/reports/Charts";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canViewProfit, canViewReports, rolesOf } from "@/lib/auth/permissions";
import { getSalesReport } from "@/lib/api/dashboard";
import { downloadSalesReportExcel } from "@/lib/export/salesReportExcel";
import type { SalesReport } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { useToast } from "@/components/providers/ToastProvider";
import {
  MobileRecordCard,
  MobileStatTile,
} from "@/components/ui/mobile-record-card";
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
  const userRoles = rolesOf(user);
  const allowed = canViewReports(userRoles);
  const showProfit = canViewProfit(userRoles);
  const [preset, setPreset] = useState<string>("thisMonth");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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
    return <ReportsPageSkeleton />;
  }

  const kpis = report?.kpis;

  async function handleExportExcel() {
    if (!report) {
      toast.warning("Chưa có dữ liệu báo cáo để xuất");
      return;
    }
    setExporting(true);
    try {
      await downloadSalesReportExcel(report);
      toast.success("Đã tải file Excel");
    } catch {
      toast.error("Không xuất được file");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Báo cáo doanh số"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExportExcel()}
            loading={exporting}
            disabled={!report || loading}>
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
                onClick={() => setPreset(item.value)}>
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
            className="ml-auto lg:hidden"
            onClick={() => void handleExportExcel()}
            loading={exporting}
            disabled={!report || loading}>
            <Download className="h-4 w-4" />
            Xuất Excel
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          title="Doanh số"
          value={kpis?.revenue}
          change={kpis?.revenueChangePercent}
          icon={TrendingUp}
          format="currency"
          accent="green"
        />
        <Kpi
          title="Đã thu"
          value={kpis?.paidAmount}
          change={kpis?.paidChangePercent}
          icon={Wallet}
          format="currency"
          accent="sky"
        />
        <Kpi
          title="Công nợ"
          value={kpis?.debt}
          icon={AlertTriangle}
          format="currency"
          accent="rose"
        />
        <Kpi
          title="Số đơn"
          value={kpis?.orderCount}
          change={kpis?.orderChangePercent}
          icon={ShoppingCart}
          accent="slate"
        />
      </div>

      {showProfit ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi
            title="Giá vốn"
            value={kpis?.costTotal}
            icon={Package}
            format="currency"
            accent="amber"
          />
          <Kpi
            title="Lãi gộp"
            value={kpis?.grossProfit}
            change={kpis?.grossProfitChangePercent}
            icon={TrendingUp}
            format="currency"
            accent="green"
          />
          <Kpi
            title="Biên lãi gộp"
            value={
              kpis?.revenue
                ? Math.round(((kpis.grossProfit || 0) / kpis.revenue) * 1000) / 10
                : 0
            }
            icon={Wallet}
            format="percent"
            accent="sky"
            className="col-span-2 md:col-span-1"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi
          title="Đơn hoàn tất"
          value={kpis?.completedCount}
          icon={ShoppingCart}
          accent="green"
        />
        <Kpi
          title="DT hoàn tất"
          value={kpis?.completedRevenue}
          icon={TrendingUp}
          format="currency"
          accent="green"
        />
        <Kpi
          title="Đơn TB"
          value={kpis?.avgOrderValue}
          icon={Wallet}
          format="currency"
          accent="sky"
          className="col-span-2 md:col-span-1"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader showOnMobile>
            <CardTitle>Doanh số & đã thu theo kỳ</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={report?.series || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader showOnMobile>
            <CardTitle>Trạng thái đơn</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusPieChart data={statusPie} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader showOnMobile>
            <CardTitle>Số đơn theo kỳ</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersBarChart data={report?.series || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader showOnMobile>
            <CardTitle>Thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(report?.paymentBreakdown || []).map((item) => {
              const amountTone =
                item.status === "paid"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : item.status === "partial"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400";
              return (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {PAYMENT_LABELS[item.status] || item.status}
                    </p>
                    <p className="text-xs text-[var(--color-text-inverse)]">
                      {item.count} đơn - GT {formatCurrency(item.total)}
                    </p>
                  </div>
                  <p className={cn("text-sm font-semibold", amountTone)}>
                    {formatCurrency(item.paidAmount)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader showOnMobile>
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
          <CardHeader showOnMobile>
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

      <div className="grid gap-4">
        <RankList
          title="Bảng đại lý"
          empty="Chưa có đại lý trong kỳ"
          items={(report?.topDealers || []).map((item, index) => ({
            id: item.dealerId || `${item.dealerName}-${index}`,
            rank: index + 1,
            title: item.dealerName,
            subtitle: item.region || undefined,
            stats: [
              { label: "Đơn", value: item.orderCount },
              {
                label: "Doanh số",
                value: formatCurrency(item.revenue),
                valueClassName: "text-[var(--color-text-secondary)]",
              },
              {
                label: "Đã thu",
                value: formatCurrency(item.paidAmount),
                valueClassName: "text-sky-600 dark:text-sky-400",
              },
            ],
          }))}
        />
        <RankList
          title="Bảng sản phẩm"
          empty="Chưa có sản phẩm trong kỳ"
          items={(report?.topProducts || []).map((item, index) => ({
            id: item.productId || `${item.productName}-${index}`,
            rank: index + 1,
            title: item.productName,
            stats: [
              { label: "SL", value: item.quantity },
              {
                label: "Doanh số",
                value: formatCurrency(item.revenue),
                valueClassName: "text-[var(--color-text-secondary)]",
              },
            ],
          }))}
        />
        <RankList
          title="Bảng nhân viên"
          empty="Chưa có nhân viên trong kỳ"
          items={(report?.topStaff || []).map((item, index) => ({
            id: item.userId || `${item.staffName}-${index}`,
            rank: index + 1,
            title: item.staffName,
            subtitle: item.employeeCode || undefined,
            stats: [
              { label: "Đơn", value: item.orderCount },
              {
                label: "Doanh số",
                value: formatCurrency(item.revenue),
                valueClassName: "text-[var(--color-text-secondary)]",
              },
              {
                label: "Đã thu",
                value: formatCurrency(item.paidAmount),
                valueClassName: "text-sky-600 dark:text-sky-400",
              },
            ],
          }))}
        />
      </div>
    </div>
  );
}

function Empty() {
  return <EmptyState title="Chưa có dữ liệu trong kỳ" size="sm" />;
}

function ChangeBadge({ value }: { value?: number }) {
  if (value == null) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium leading-none",
        up
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      )}>
      <Icon className="h-3.5 w-3.5" />
      <span className="lg:hidden">{Math.abs(value)}%</span>
      <span className="hidden lg:inline">{Math.abs(value)}% so với kỳ trước</span>
    </span>
  );
}

function Kpi({
  title,
  value,
  change,
  icon: Icon,
  format,
  accent = "slate",
  className,
}: {
  title: string;
  value?: number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  format?: "currency" | "percent";
  accent?: "green" | "sky" | "rose" | "slate" | "amber";
  className?: string;
}) {
  const tone = {
    green: {
      icon: "bg-[var(--color-text-secondary)]/12 text-[var(--color-text-secondary)]",
      bar: "bg-[var(--color-text-secondary)]",
      value: "text-[var(--color-text-secondary)]",
    },
    sky: {
      icon: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
      bar: "bg-sky-500",
      value: "text-sky-600 dark:text-sky-400",
    },
    rose: {
      icon: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
      bar: "bg-rose-500",
      value: "text-rose-600 dark:text-rose-400",
    },
    amber: {
      icon: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
      value: "text-amber-600 dark:text-amber-400",
    },
    slate: {
      icon: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
      bar: "bg-slate-500",
      value: "text-[var(--color-text-primary)]",
    },
  }[accent];

  const displayValue =
    format === "currency"
      ? formatCurrency(value || 0)
      : format === "percent"
        ? `${value || 0}%`
        : value || 0;

  return (
    <Card className={cn("h-full overflow-hidden", className)}>
      <CardContent className="space-y-3 p-3.5 md:space-y-4 md:p-5">
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <p className="min-w-0 text-xs font-medium text-[var(--color-text-inverse)] md:text-sm">
            {title}
          </p>
          <span
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10",
              tone.icon
            )}>
            <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </span>
        </div>

        <div className="space-y-2 md:space-y-3">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
            <p
              className={cn(
                "text-xl font-semibold leading-none tracking-tight md:text-[1.65rem]",
                tone.value
              )}>
              {displayValue}
            </p>
            <ChangeBadge value={change} />
          </div>
          <div className={cn("h-1 w-10 rounded-full opacity-60", tone.bar)} />
        </div>
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

type RankStat = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

type RankItem = {
  id: string;
  rank: number;
  title: string;
  subtitle?: string;
  stats: RankStat[];
};

function RankList({
  title,
  items,
  empty = "Chưa có dữ liệu trong kỳ",
}: {
  title: string;
  items: RankItem[];
  empty?: string;
}) {
  const tableHeaders = items[0]
    ? [title.replace(/^Bảng\s+/i, ""), ...items[0].stats.map((s) => s.label)]
    : [];
  const colWidths = rankTableColumnWidths(tableHeaders.length || 3);

  return (
    <Card>
      <CardHeader showOnMobile>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState title={empty} size="sm" />
        ) : (
          <>
            {/* Mobile: ranked cards */}
            <div className="crm-stagger-list flex flex-col gap-3.5 lg:hidden">
              {items.map((item) => (
                <MobileRecordCard key={item.id} className="p-3 shadow-none">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        item.rank <= 3
                          ? "bg-[var(--color-text-secondary)]/12 text-[var(--color-text-secondary)]"
                          : "bg-[var(--color-surface-muted)] text-[var(--color-text-inverse)]"
                      )}>
                      {item.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold tracking-tight text-[var(--color-text-primary)]">
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p className="mt-0.5 truncate text-sm text-[var(--color-text-inverse)]">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "mt-3 grid gap-2",
                      item.stats.length === 2 ? "grid-cols-2" : "grid-cols-3"
                    )}>
                    {item.stats.map((stat) => (
                      <MobileStatTile
                        key={stat.label}
                        label={stat.label}
                        valueClassName={cn("text-sm", stat.valueClassName)}>
                        {stat.value}
                      </MobileStatTile>
                    ))}
                  </div>
                </MobileRecordCard>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="crm-table-scroll hidden lg:block">
              <div className="crm-table-frame">
                <table className="crm-data-table min-w-[300px] table-fixed">
                <colgroup>
                  {colWidths.map((width, index) => (
                    <col key={`${tableHeaders[index]}-${index}`} style={{ width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {tableHeaders.map((header, index) => (
                      <th
                        key={header}
                        className={cn(
                          "font-medium",
                          index === 0 ? "text-left" : "text-right"
                        )}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="max-w-0 align-top font-medium">
                        <p className="truncate">{item.title}</p>
                        {item.subtitle ? (
                          <p className="truncate text-xs font-normal text-[var(--color-text-inverse)]">
                            {item.subtitle}
                          </p>
                        ) : null}
                      </td>
                      {item.stats.map((stat) => (
                        <td
                          key={stat.label}
                          className={cn(
                            "whitespace-nowrap text-right align-top tabular-nums",
                            stat.valueClassName || "text-[var(--color-text-inverse)]"
                          )}>
                          {stat.value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
