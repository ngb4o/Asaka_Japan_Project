"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Handshake,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Package,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccessPath } from "@/lib/auth/permissions";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import type { UserRole } from "@/lib/types";

type BadgeKey = "leads" | "dealers" | "orders";

type TabDef = {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: BadgeKey | null;
  action?: "menu";
};

/** Primary mobile tabs per role — always end with Menu for the rest of the sidebar. */
const TABS_BY_ROLE: Record<UserRole, TabDef[]> = {
  admin: [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/orders", label: "Đơn", icon: ShoppingCart, badgeKey: "orders" },
    { href: "/leads", label: "Lead", icon: MessageSquare, badgeKey: "leads" },
    { href: "/dealers", label: "Đại lý", icon: Handshake, badgeKey: "dealers" },
    { label: "Menu", icon: Menu, action: "menu" },
  ],
  sales: [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/orders", label: "Đơn", icon: ShoppingCart, badgeKey: "orders" },
    { href: "/leads", label: "Lead", icon: MessageSquare, badgeKey: "leads" },
    { href: "/inventory", label: "Kho", icon: Package },
    { label: "Menu", icon: Menu, action: "menu" },
  ],
  warehouse: [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/orders", label: "Đơn", icon: ShoppingCart, badgeKey: "orders" },
    { href: "/leads", label: "Lead", icon: MessageSquare, badgeKey: "leads" },
    { href: "/inventory", label: "Kho", icon: Package },
    { label: "Menu", icon: Menu, action: "menu" },
  ],
  accountant: [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/orders", label: "Đơn", icon: ShoppingCart, badgeKey: "orders" },
    { href: "/reports", label: "Báo cáo", icon: BarChart3 },
    { href: "/payroll", label: "Lương", icon: Wallet },
    { label: "Menu", icon: Menu, action: "menu" },
  ],
};

const FALLBACK_TABS: TabDef[] = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { label: "Menu", icon: Menu, action: "menu" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type MobileBottomNavProps = {
  onOpenMenu: () => void;
};

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { counts } = useNotifications();

  const candidates = user?.role
    ? TABS_BY_ROLE[user.role] || FALLBACK_TABS
    : FALLBACK_TABS;

  const tabs = candidates.filter((tab) => {
    if (tab.action === "menu") return true;
    if (!tab.href) return false;
    return canAccessPath(user?.role, tab.href);
  });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Điều hướng chính"
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.href ? isActive(pathname, tab.href) : false;
          const badge =
            tab.badgeKey && counts[tab.badgeKey] > 0
              ? counts[tab.badgeKey]
              : 0;

          if (tab.action === "menu") {
            return (
              <button
                key="menu"
                type="button"
                onClick={onOpenMenu}
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[var(--color-text-inverse)]"
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate text-[10px] font-medium leading-none">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href!}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-colors",
                active
                  ? "text-[var(--color-text-secondary)]"
                  : "text-[var(--color-text-inverse)]"
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5 shrink-0" />
                {badge > 0 ? (
                  <span className="absolute -right-2 -top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </span>
              <span className="truncate text-[10px] font-medium leading-none">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
