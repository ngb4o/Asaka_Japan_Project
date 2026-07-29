"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  ChevronDown,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Newspaper,
  Package,
  ChartColumn,
  Route,
  Send,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccessPath, ROLE_LABELS, ROLE_WORKSPACE_SUBTITLE } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/ToastProvider";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { ChangePasswordDialog } from "@/components/layout/ChangePasswordDialog";

type BadgeKey = "leads" | "dealers" | "orders" | "stock";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: BadgeKey | null;
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
    items: [
      {
        href: "/dashboard",
        label: "Tổng quan",
        icon: LayoutDashboard,
        badgeKey: null,
      },
      {
        href: "/reports",
        label: "Báo cáo doanh số",
        icon: ChartColumn,
        badgeKey: null,
      },
    ],
  },
  {
    id: "sales",
    label: "Kinh doanh",
    icon: BriefcaseBusiness,
    items: [
      {
        href: "/leads",
        label: "Khách tiềm năng",
        icon: MessageSquare,
        badgeKey: "leads",
      },
      { href: "/dealers", label: "Đại lý", icon: Handshake, badgeKey: "dealers" },
      {
        href: "/orders",
        label: "Đơn hàng",
        icon: ShoppingCart,
        badgeKey: "orders",
      },
    ],
  },
  {
    id: "catalog",
    label: "Sản phẩm & Kho",
    icon: Package,
    items: [
      {
        href: "/product-categories",
        label: "Loại sản phẩm",
        icon: Tags,
        badgeKey: null,
      },
      { href: "/products", label: "Sản phẩm", icon: Package, badgeKey: null },
      {
        href: "/warehouses",
        label: "Kho hàng",
        icon: Warehouse,
        badgeKey: null,
      },
      {
        href: "/inventory",
        label: "Tồn kho",
        icon: ArrowLeftRight,
        badgeKey: "stock",
      },
    ],
  },
  {
    id: "ops",
    label: "Nhân sự & công tác",
    icon: UsersRound,
    items: [
      {
        href: "/employees",
        label: "Hồ sơ nhân viên",
        icon: UsersRound,
        badgeKey: null,
      },
      { href: "/trips", label: "Chuyến công tác", icon: Route, badgeKey: null },
      { href: "/payroll", label: "Bảng lương", icon: Wallet, badgeKey: null },
    ],
  },
  {
    id: "content",
    label: "Nội dung",
    icon: Newspaper,
    items: [{ href: "/news", label: "Tin tức", icon: Newspaper, badgeKey: null }],
  },
  {
    id: "system",
    label: "Hệ thống",
    icon: Settings,
    items: [
      { href: "/users", label: "Tài khoản CRM", icon: Users, badgeKey: null },
      {
        href: "/settings/telegram",
        label: "Thông báo Telegram",
        icon: Send,
        badgeKey: null,
      },
    ],
  },
];

const STORAGE_KEY = "crm_nav_open_groups";

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  mobileOpen = false,
  onMobileOpenChange,
}: {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
} = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const toast = useToast();
  const { counts } = useNotifications();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessPath(user?.role, item.href)),
    })).filter((group) => group.items.length > 0);
  }, [user?.role]);

  useEffect(() => {
    const activeIds = visibleGroups
      .filter((group) =>
        group.items.some((item) => isActivePath(pathname, item.href))
      )
      .map((group) => group.id);

    setOpenGroups((prev) => {
      let stored: Record<string, boolean> = {};
      try {
        stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      } catch {
        stored = {};
      }

      const next = { ...stored, ...prev };
      for (const id of activeIds) {
        next[id] = true;
      }
      for (const group of visibleGroups) {
        if (next[group.id] === undefined) {
          next[group.id] = activeIds.includes(group.id) || group.id === "sales";
        }
      }
      return next;
    });
  }, [pathname, visibleGroups]);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  async function handleLogout() {
    try {
      await logout();
      toast.success("Đã đăng xuất");
    } catch {
      toast.error("Đăng xuất thất bại");
    }
  }

  const closeMobile = () => onMobileOpenChange?.(false);

  const panelClassName =
    "flex h-full w-[min(100vw-2.5rem,288px)] shrink-0 flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-bg)] text-[var(--color-sidebar-fg)]";

  const navPanel = (
    <>
      <div className="flex shrink-0 items-center gap-3 px-5 py-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
          <Image
            src="/images/brand/logo.png"
            alt="ASAKA JAPAN"
            width={80}
            height={80}
            quality={100}
            className="h-full w-full object-contain"
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-wide text-white">
            ASAKA CRM
          </p>
          <p className="truncate text-xs text-[var(--color-sidebar-muted)]">
            {user?.role ? ROLE_WORKSPACE_SUBTITLE[user.role] : "Quản lý kinh doanh"}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const open = openGroups[group.id] ?? false;
          const groupActive = group.items.some((item) =>
            isActivePath(pathname, item.href)
          );
          const groupBadge = group.items.reduce((sum, item) => {
            if (!item.badgeKey) return sum;
            return sum + (counts[item.badgeKey] || 0);
          }, 0);

          return (
            <div key={group.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors",
                  groupActive
                    ? "bg-white/10 text-white"
                    : "text-[var(--color-sidebar-muted)] hover:bg-white/5 hover:text-white"
                )}
              >
                <GroupIcon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="flex-1 truncate normal-case tracking-normal">
                  {group.label}
                </span>
                {groupBadge > 0 ? (
                  <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {groupBadge > 99 ? "99+" : groupBadge}
                  </span>
                ) : null}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200",
                    open ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>

              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-0.5 pb-1 pl-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActivePath(pathname, item.href);
                      const badgeCount = item.badgeKey
                        ? counts[item.badgeKey]
                        : 0;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMobile}
                          className={cn(
                            "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-[var(--color-sidebar-active-bg)] text-[var(--color-sidebar-active-fg)]"
                              : "text-[var(--color-sidebar-muted)] hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {active ? (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[var(--color-sidebar-active-fg)]" />
                          ) : null}
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {badgeCount > 0 ? (
                            <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 space-y-3 border-t border-[var(--color-sidebar-border)] p-4">
        <div className="rounded-xl bg-white/5 px-3 py-3">
          <p className="truncate text-sm font-semibold text-white">
            {user?.employeeName || user?.email}
          </p>
          <p className="truncate text-xs text-[var(--color-sidebar-muted)]">
            {user?.email}
          </p>
          {user?.role ? (
            <p className="mt-1 text-xs font-medium text-[var(--color-sidebar-active-fg)]">
              {ROLE_LABELS[user.role]}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
          onClick={() => setPasswordOpen(true)}
        >
          <KeyRound className="h-4 w-4" />
          Đổi mật khẩu
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-white/10 bg-transparent text-white hover:bg-white/10 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          panelClassName,
          "sticky top-0 hidden h-screen w-[272px] lg:flex"
        )}
      >
        {navPanel}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Đóng menu"
            onClick={closeMobile}
          />
          <aside
            className={cn(panelClassName, "relative z-10 h-full shadow-2xl")}
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            {navPanel}
          </aside>
        </div>
      ) : null}
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
