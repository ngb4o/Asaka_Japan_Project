"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  FileText,
  Handshake,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Newspaper,
  Package,
  ShoppingCart,
  Tags,
  Warehouse,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccessPath, ROLE_LABELS } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useToast } from "@/components/providers/ToastProvider";
import { useNotifications } from "@/lib/notifications/NotificationProvider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, badgeKey: null },
  { href: "/leads", label: "Lead liên hệ", icon: MessageSquare, badgeKey: "leads" as const },
  { href: "/dealers", label: "Đại lý", icon: Handshake, badgeKey: "dealers" as const },
  { href: "/quotes", label: "Báo giá", icon: FileText, badgeKey: null },
  { href: "/orders", label: "Đơn hàng", icon: ShoppingCart, badgeKey: "orders" as const },
  { href: "/product-categories", label: "Loại sản phẩm", icon: Tags, badgeKey: null },
  { href: "/products", label: "Sản phẩm", icon: Package, badgeKey: null },
  { href: "/warehouses", label: "Kho hàng", icon: Warehouse, badgeKey: null },
  { href: "/inventory", label: "Tồn kho", icon: ArrowLeftRight, badgeKey: "stock" as const },
  { href: "/news", label: "Tin tức", icon: Newspaper, badgeKey: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const toast = useToast();
  const { counts } = useNotifications();

  async function handleLogout() {
    try {
      await logout();
      toast.success("Đã đăng xuất");
    } catch {
      toast.error("Đăng xuất thất bại");
    }
  }

  const visibleNav = NAV_ITEMS.filter((item) => canAccessPath(user?.role, item.href));

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border-subtle)] px-5 py-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5">
          <Image
            src="/images/brand/logo.png"
            alt="ASAKA JAPAN"
            width={80}
            height={80}
            quality={100}
            className="h-full w-full object-contain"
          />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">ASAKA CRM</p>
          <p className="text-xs text-[var(--color-text-inverse)]">Quản lý kinh doanh</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]"
                  : "text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 ? (
                <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 space-y-3 border-t border-[var(--color-border-subtle)] p-4">
        <div>
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {user?.username}
          </p>
          <p className="truncate text-xs text-[var(--color-text-inverse)]">{user?.email}</p>
          {user?.role && user.role !== "admin" ? (
            <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
              {ROLE_LABELS[user.role]}
            </p>
          ) : null}
        </div>
        <ThemeToggle className="w-full" />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  );
}
