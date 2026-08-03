"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChartColumn,
  Handshake,
  MessageSquare,
  Package,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  OrdersBarChart,
  RevenueAreaChart,
  StatusPieChart,
} from "@/components/reports/Charts";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  canViewCompanyFinancials,
  canViewReports,
  DASHBOARD_HERO_SUBTITLE,
  hasRole,
  primaryRole,
  ROLE_LABELS,
  rolesOf,
} from "@/lib/auth/permissions";
import { getDashboardSummary } from "@/lib/api/dashboard";
import type { DashboardSummary } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Hủy",
};

const ORDER_STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  confirmed: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  delivering: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const PAYMENT_META: Record<
  string,
  { label: string; color: string; track: string }
> = {
  paid: {
    label: "Đã thanh toán",
    color: "bg-emerald-500",
    track: "bg-emerald-500/15",
  },
  partial: {
    label: "Thanh toán một phần",
    color: "bg-amber-500",
    track: "bg-amber-500/15",
  },
  unpaid: {
    label: "Chưa thanh toán",
    color: "bg-rose-500",
    track: "bg-rose-500/15",
  },
};

function todayLabel() {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const userRoles = rolesOf(user);
  const mainRole = primaryRole(userRoles, user?.role);
  const canReports = canViewReports(userRoles);
  const canFinancials = canViewCompanyFinancials(userRoles);
  const heroSubtitle =
    (mainRole && DASHBOARD_HERO_SUBTITLE[mainRole]) ||
    "Theo dõi công việc hàng ngày.";
  const isWarehouseView = hasRole(userRoles, "warehouse") && !canFinancials;
  const isSalesView = hasRole(userRoles, "sales") && !canFinancials && !isWarehouseView;

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Không tải được dữ liệu");
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = summary?.stats;
  const collectionRate =
    stats?.monthRevenue && stats.monthRevenue > 0
      ? Math.min(100, Math.round((stats.monthPaid / stats.monthRevenue) * 100))
      : 0;

  const statusPie = useMemo(
    () =>
      (summary?.statusBreakdown || []).map((item) => ({
        name: ORDER_STATUS_LABELS[item.status] || item.status,
        value: item.count,
      })),
    [summary?.statusBreakdown]
  );

  const paymentTotal = useMemo(
    () =>
      (summary?.paymentBreakdown || []).reduce((sum, item) => sum + item.count, 0) ||
      1,
    [summary?.paymentBreakdown]
  );

  const displayName = user?.employeeName || user?.email?.split("@")[0] || "bạn";

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(1,125,3,0.12),_transparent_55%)]" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--color-text-secondary)]/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--color-text-secondary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                {todayLabel()}
              </span>
              {userRoles.length ? (
                <Badge variant="muted">{userRoles.map((r) => ROLE_LABELS[r]).join(" · ")}</Badge>
              ) : null}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] md:text-3xl">
                Xin chào, {displayName}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-[var(--color-text-inverse)]">
                {heroSubtitle}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReports ? (
              <Button asChild>
                <Link href="/reports">
                  <ChartColumn className="h-4 w-4" />
                  Báo cáo chi tiết
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/orders">
                Đơn hàng
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {/* KPI strip */}
      {canFinancials ? (
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          title="Doanh số tháng"
          hint="so với tháng trước"
          value={loading ? null : stats?.monthRevenue}
          change={stats?.revenueChangePercent}
          icon={TrendingUp}
          accent="green"
          format="currency"
          href="/reports"
        />
        <KpiCard
          title="Đã thu"
          hint={`${collectionRate}% doanh số`}
          value={loading ? null : stats?.monthPaid}
          icon={Wallet}
          accent="sky"
          format="currency"
          href="/orders"
          progress={collectionRate}
        />
        <KpiCard
          title="Công nợ"
          hint="chưa thu trong tháng"
          value={loading ? null : stats?.monthDebt}
          icon={AlertTriangle}
          accent="rose"
          format="currency"
          href="/orders"
        />
        <KpiCard
          title="Đơn hàng"
          hint="so với tháng trước"
          value={loading ? null : stats?.monthOrders}
          change={stats?.orderChangePercent}
          icon={ShoppingCart}
          accent="slate"
          href="/orders"
        />      </section>
      ) : (
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {isWarehouseView ? (
          <>
            <KpiCard
              title="Đơn chờ xử lý"
              hint="cần xử lý kho"
              value={loading ? null : stats?.pendingOrders}
              icon={ShoppingCart}
              accent="amber"
              href="/orders"
            />
            <KpiCard
              title="Tồn thấp"
              hint="dưới ngưỡng cảnh báo"
              value={loading ? null : stats?.lowStockCount}
              icon={AlertTriangle}
              accent="rose"
              href="/inventory"
            />
            <KpiCard
              title="Đơn tháng này"
              hint="so với tháng trước"
              value={loading ? null : stats?.monthOrders}
              change={stats?.orderChangePercent}
              icon={Package}
              accent="slate"
              href="/orders"
            />
            <KpiCard
              title="Sản phẩm"
              hint="đang quản lý"
              value={loading ? null : stats?.totalProducts}
              icon={Package}
              accent="green"
              href="/products"
            />
          </>
        ) : (
          <>
            <KpiCard
              title="Lead mới"
              hint="chưa xử lý"
              value={loading ? null : stats?.newLeads}
              icon={MessageSquare}
              accent="green"
              href="/leads"
            />
            <KpiCard
              title="Đại lý hoạt động"
              value={loading ? null : stats?.activeDealers}
              icon={Handshake}
              accent="sky"
              href="/dealers"
            />
            <KpiCard
              title="Đơn chờ xử lý"
              value={loading ? null : stats?.pendingOrders}
              icon={ShoppingCart}
              accent="amber"
              href="/orders"
            />
            <KpiCard
              title="Đơn tháng này"
              hint="so với tháng trước"
              value={loading ? null : stats?.monthOrders}
              change={stats?.orderChangePercent}
              icon={ShoppingCart}
              accent="slate"
              href="/orders"
            />
          </>
        )}
      </section>
      )}

      {canFinancials ? (
        <>
          <section className="grid gap-4 xl:grid-cols-5">
            <Card className="overflow-hidden xl:col-span-3">
              <CardHeader showOnMobile className="border-none pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Xu hướng doanh số</CardTitle>
                    <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                      6 tháng gần nhất - doanh số vs đã thu
                    </p>
                  </div>
                  <Link
                    href="/reports"
                    className="shrink-0 text-xs font-medium text-[var(--color-text-secondary)] hover:underline"
                  >
                    Chi tiết
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <Skeleton className="h-[300px] w-full rounded-xl" />
                ) : (
                  <RevenueAreaChart data={summary?.revenueSeries || []} height={300} />
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden xl:col-span-2">
              <CardHeader showOnMobile className="border-none pb-0">
                <CardTitle>Trạng thái đơn</CardTitle>
                <p className="mt-1 text-sm text-[var(--color-text-inverse)]">Phân bổ trong tháng</p>
              </CardHeader>
              <CardContent className="pt-2">
                {loading ? (
                  <Skeleton className="h-[300px] w-full rounded-xl" />
                ) : (
                  <StatusPieChart data={statusPie} height={300} />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-5">
            <Card className="overflow-hidden lg:col-span-3">
              <CardHeader showOnMobile className="border-none pb-0">
                <CardTitle>Số đơn theo tháng</CardTitle>
                <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                  Khối lượng đơn (không gồm hủy)
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? (
                  <Skeleton className="h-[240px] w-full rounded-xl" />
                ) : (
                  <OrdersBarChart data={summary?.revenueSeries || []} />
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader showOnMobile className="border-none pb-0">
                <CardTitle>Thanh toán</CardTitle>
                <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                  Theo trạng thái tháng này
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {loading ? (
                  <Skeleton className="h-40 w-full rounded-xl" />
                ) : summary?.paymentBreakdown?.length ? (
                  summary.paymentBreakdown.map((item) => {
                    const meta = PAYMENT_META[item.status] || PAYMENT_META.unpaid;
                    const pct = Math.round((item.count / paymentTotal) * 100);
                    return (
                      <div key={item.status} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{meta.label}</span>
                          <span className="text-[var(--color-text-inverse)]">
                            {item.count} đơn - {pct}%
                          </span>
                        </div>
                        <div className={cn("h-2 overflow-hidden rounded-full", meta.track)}>
                          <div
                            className={cn("h-full rounded-full transition-all", meta.color)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-[var(--color-text-inverse)]">
                          GT {formatCurrency(item.total)} - đã thu {formatCurrency(item.paidAmount)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[var(--color-text-inverse)]">Chưa có dữ liệu</p>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : isSalesView ? (
        <section className="grid gap-4 xl:grid-cols-5">
          <Card className="overflow-hidden xl:col-span-3">
            <CardHeader showOnMobile className="border-none pb-0">
              <CardTitle>Số đơn theo tháng</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                Khối lượng đơn (không gồm hủy)
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <Skeleton className="h-[240px] w-full rounded-xl" />
              ) : (
                <OrdersBarChart data={summary?.revenueSeries || []} />
              )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden xl:col-span-2">
            <CardHeader showOnMobile className="border-none pb-0">
              <CardTitle>Trạng thái đơn</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-text-inverse)]">Phân bổ trong tháng</p>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <Skeleton className="h-[240px] w-full rounded-xl" />
              ) : (
                <StatusPieChart data={statusPie} height={240} />
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Ops shortcuts */}
      {canFinancials ? (
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <QuickStat
          title="Lead mới"
          value={loading ? null : stats?.newLeads}
          icon={MessageSquare}
          href="/leads"
          accent="green"
        />
        <QuickStat
          title="Đại lý hoạt động"
          value={loading ? null : stats?.activeDealers}
          icon={Handshake}
          href="/dealers"
          accent="sky"
        />
        <QuickStat
          title="Đơn chờ xử lý"
          value={loading ? null : stats?.pendingOrders}
          icon={ShoppingCart}
          href="/orders"
          accent="amber"
          highlight={(stats?.pendingOrders || 0) > 0}
        />
        <QuickStat
          title="Sản phẩm"
          value={loading ? null : stats?.totalProducts}
          icon={Package}
          href="/products"
          accent="slate"
        />
      </section>
      ) : null}

      {/* Lists */}
      <section
        className={cn(
          "grid gap-4",
          isSalesView ? "xl:grid-cols-1" : "xl:grid-cols-5"
        )}
      >
        <Card className={isSalesView ? "" : "xl:col-span-3"}>
          <CardHeader showOnMobile className="flex flex-row items-center justify-between border-none pb-0">
            <div>
              <CardTitle>Đơn gần đây</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                Cập nhật mới nhất trong hệ thống
              </p>
            </div>
            <Link
              href="/orders"
              className="text-xs font-medium text-[var(--color-text-secondary)] hover:underline"
            >
              Xem tất cả
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : summary?.recentOrders.length ? (
              <div className="divide-y divide-[var(--color-border-subtle)] rounded-xl border border-[var(--color-border-subtle)]">
                {summary.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--color-surface-muted)]/60"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tracking-tight">{order.code}</p>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[13px] font-medium leading-none md:px-2.5 md:py-1 md:text-[13px]",
                            ORDER_STATUS_TONE[order.status] || ORDER_STATUS_TONE.pending
                          )}
                        >
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-[var(--color-text-inverse)]">
                        {order.customerName || "Khách lẻ"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "font-semibold",
                          order.paymentStatus === "paid"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : order.paymentStatus === "partial"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {formatCurrency(order.total)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-inverse)]">
                        {order.paymentStatus === "paid"
                          ? "Đã TT"
                          : order.paymentStatus === "partial"
                            ? "TT một phần"
                            : "Chưa TT"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Chưa có đơn hàng" />
            )}
          </CardContent>
        </Card>

        {!isSalesView ? (
        <Card className="xl:col-span-2">
          <CardHeader showOnMobile className="border-none pb-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  Sắp hết hàng
                </CardTitle>
                <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                  Ngưỡng cảnh báo ≤ 20
                </p>
              </div>
              <Link
                href="/inventory"
                className="text-xs font-medium text-[var(--color-text-secondary)] hover:underline"
              >
                Tồn kho
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : summary?.lowStock.length ? (
              <div className="space-y-3">
                {summary.lowStock.map((item) => {
                  const pct = Math.min(100, Math.round((item.quantity / 20) * 100));
                  return (
                    <div
                      key={item.productId}
                      className="rounded-xl border border-[var(--color-border-subtle)] px-3.5 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium">{item.productName}</p>
                        <span className="shrink-0 text-sm font-semibold text-amber-600">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-amber-500/15">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(stats?.lowStockCount || 0) > (summary.lowStock.length || 0) ? (
                  <p className="text-xs text-[var(--color-text-inverse)]">
                    +{(stats?.lowStockCount || 0) - summary.lowStock.length} sản phẩm khác
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyState text="Tồn kho đang ổn định" />
            )}
          </CardContent>
        </Card>
        ) : null}
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]/40">
      <p className="text-sm text-[var(--color-text-inverse)]">{text}</p>
    </div>
  );
}

function ChangeBadge({ value }: { value?: number }) {
  if (value == null) return null;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none",
        up
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value)}%
    </span>
  );
}

const ACCENT = {
  green: {
    icon: "bg-[var(--color-text-secondary)]/12 text-[var(--color-text-secondary)]",
    bar: "bg-[var(--color-text-secondary)]",
    track: "bg-[var(--color-text-secondary)]/15",
    value: "text-[var(--color-text-secondary)]",
  },
  sky: {
    icon: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
    track: "bg-sky-500/15",
    value: "text-sky-600 dark:text-sky-400",
  },
  amber: {
    icon: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    track: "bg-amber-500/15",
    value: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    icon: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
    track: "bg-rose-500/15",
    value: "text-rose-600 dark:text-rose-400",
  },
  slate: {
    icon: "bg-slate-500/12 text-slate-600 dark:text-slate-300",
    bar: "bg-slate-500",
    track: "bg-slate-500/15",
    value: "text-[var(--color-text-primary)]",
  },
} as const;

function KpiCard({
  title,
  hint,
  value,
  change,
  icon: Icon,
  href,
  format,
  accent,
  progress,
}: {
  title: string;
  hint?: string;
  value: number | null | undefined;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  format?: "currency";
  accent: keyof typeof ACCENT;
  progress?: number;
}) {
  const tone = ACCENT[accent];
  return (
    <Link href={href} className="group block">
      <Card className="h-full overflow-hidden border-[var(--color-border-subtle)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-elevated)]">
        <CardContent className="space-y-3 p-3.5 md:space-y-4 md:p-5">
          <div className="flex items-start justify-between gap-2 md:gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--color-text-inverse)] md:text-sm">{title}</p>
              {hint ? (
                <p className="mt-0.5 text-[11px] text-[var(--color-text-inverse)]/80">{hint}</p>
              ) : null}
            </div>
            <span
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10",
                tone.icon
              )}
            >
              <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </span>
          </div>

          {value == null ? (
            <Skeleton className="h-8 w-24 md:h-9 md:w-32" />
          ) : (
            <div className="space-y-2 md:space-y-3">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
                <p
                  className={cn(
                    "text-xl font-semibold leading-none tracking-tight md:text-[1.65rem]",
                    tone.value
                  )}
                >
                  {format === "currency" ? formatCurrency(value) : value}
                </p>
                <ChangeBadge value={change} />
              </div>
              {typeof progress === "number" ? (
                <div className={cn("h-1.5 overflow-hidden rounded-full", tone.track)}>
                  <div
                    className={cn("h-full rounded-full", tone.bar)}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              ) : (
                <div className={cn("h-1 w-10 rounded-full opacity-60", tone.bar)} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickStat({
  title,
  value,
  icon: Icon,
  href,
  highlight,
  accent = "slate",
}: {
  title: string;
  value: number | null | undefined;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  highlight?: boolean;
  accent?: keyof typeof ACCENT;
}) {
  const tone = ACCENT[accent];
  return (
    <Link href={href} className="group block">
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 py-3 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-elevated)] md:gap-3 md:px-4 md:py-3.5",
          highlight && "border-amber-300/70 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
        )}
      >
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10",
            tone.icon
          )}
        >
          <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] text-[var(--color-text-inverse)] md:text-xs">{title}</p>
          {value == null ? (
            <Skeleton className="mt-1 h-6 w-12" />
          ) : (
            <p className={cn("text-base font-semibold tracking-tight md:text-lg", tone.value)}>{value}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
