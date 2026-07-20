"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Handshake,
  MessageSquare,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDashboardSummary } from "@/lib/api/dashboard";
import { NotificationBell } from "@/components/layout/NotificationBell";
import type { DashboardSummary } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Hủy",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "Không tải được dữ liệu");
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = summary?.stats;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Xin chào, {user?.username}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
            Tổng quan hoạt động kinh doanh ASAKA JAPAN
          </p>
        </div>
        <NotificationBell />
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Lead mới"
          value={loading ? null : stats?.newLeads}
          icon={MessageSquare}
          href="/leads"
        />
        <StatCard
          title="Đại lý hoạt động"
          value={loading ? null : stats?.activeDealers}
          icon={Handshake}
          href="/dealers"
        />
        <StatCard
          title="Đơn chờ xử lý"
          value={loading ? null : stats?.pendingOrders}
          icon={ShoppingCart}
          href="/orders"
        />
        <StatCard
          title="Doanh thu hoàn tất"
          value={loading ? null : stats?.revenue}
          icon={TrendingUp}
          href="/orders"
          format="currency"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lead gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : summary?.recentLeads.length ? (
              <div className="space-y-3">
                {summary.recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-xs text-[var(--color-text-inverse)]">
                        {lead.phone} · {lead.type === "dealer" ? "Đại lý" : "Liên hệ"}
                      </p>
                    </div>
                    <Badge variant={lead.status === "new" ? "success" : "muted"}>
                      {lead.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-inverse)]">Chưa có lead</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Sắp hết hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : summary?.lowStock.length ? (
              <div className="space-y-3">
                {summary.lowStock.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate pr-2">{item.productName}</span>
                    <span className="font-medium text-amber-600">{item.quantity}</span>
                  </div>
                ))}
                <Link
                  href="/inventory"
                  className="inline-block text-sm text-[var(--color-text-secondary)] hover:underline"
                >
                  Xem tồn kho →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-inverse)]">Tồn kho ổn định</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : summary?.recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                    <th className="px-2 py-2 font-medium">Mã</th>
                    <th className="px-2 py-2 font-medium">Khách</th>
                    <th className="px-2 py-2 font-medium">Tổng</th>
                    <th className="px-2 py-2 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-[var(--color-border-subtle)]">
                      <td className="px-2 py-2 font-medium">{order.code}</td>
                      <td className="px-2 py-2">{order.customerName || "—"}</td>
                      <td className="px-2 py-2">{formatCurrency(order.total)}</td>
                      <td className="px-2 py-2">
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có đơn hàng</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniLinkCard
          title="Sản phẩm"
          value={loading ? "—" : String(stats?.totalProducts ?? 0)}
          href="/products"
          icon={Package}
        />
        <MiniLinkCard
          title="Tổng lead"
          value={loading ? "—" : String(stats?.totalLeads ?? 0)}
          href="/leads"
          icon={MessageSquare}
        />
        <MiniLinkCard
          title="Cảnh báo tồn"
          value={loading ? "—" : String(stats?.lowStockCount ?? 0)}
          href="/inventory"
          icon={AlertTriangle}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  format,
}: {
  title: string;
  value: number | null | undefined;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  format?: "currency";
}) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-[var(--shadow-elevated)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5 text-[var(--color-text-secondary)]" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {value == null ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-2xl font-semibold">
              {format === "currency" ? formatCurrency(value) : value}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniLinkCard({
  title,
  value,
  href,
  icon: Icon,
}: {
  title: string;
  value: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-[var(--shadow-elevated)]">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-[var(--color-text-inverse)]">{title}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
          <Icon className="h-5 w-5 text-[var(--color-text-secondary)]" />
        </CardContent>
      </Card>
    </Link>
  );
}
