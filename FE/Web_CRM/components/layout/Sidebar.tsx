"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
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
  Settings,
  ShoppingCart,
  Tags,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
} from "@/components/ui/icons";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccessPath, ROLE_LABELS, ROLE_WORKSPACE_SUBTITLE, primaryRole, rolesOf } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/ToastProvider";
import { ChangePasswordDialog } from "@/components/layout/ChangePasswordDialog";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
      },
      {
        href: "/reports",
        label: "Báo cáo doanh số",
        icon: ChartColumn,
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
      },
      { href: "/dealers", label: "Đại lý", icon: Handshake },
      {
        href: "/orders",
        label: "Đơn hàng",
        icon: ShoppingCart,
      },
      {
        href: "/receivables",
        label: "Công nợ",
        icon: AlertTriangle,
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
      },
      { href: "/products", label: "Sản phẩm", icon: Package },
      {
        href: "/inventory",
        label: "Kho hàng",
        icon: Warehouse,
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
      },
      { href: "/trips", label: "Chuyến công tác", icon: Route },
      { href: "/payroll", label: "Bảng lương", icon: Wallet },
    ],
  },
  {
    id: "content",
    label: "Nội dung",
    icon: Newspaper,
    items: [{ href: "/news", label: "Tin tức", icon: Newspaper }],
  },
  {
    id: "system",
    label: "Hệ thống",
    icon: Settings,
    items: [
      { href: "/users", label: "Tài khoản CRM", icon: Users },
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
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [loggingOut, setLoggingOut] = useState(false);

  const visibleGroups = useMemo(() => {
    const accessRoles = rolesOf(user);
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessPath(accessRoles, item.href)),
    })).filter((group) => group.items.length > 0);
  }, [user]);

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
    setLoggingOut(true);
    try {
      await logout();
      toast.success("Đã đăng xuất");
    } catch {
      toast.error("Đăng xuất thất bại");
    } finally {
      setLoggingOut(false);
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
            {user
              ? ROLE_WORKSPACE_SUBTITLE[primaryRole(rolesOf(user), user.role) || "sales"]
              : "Quản lý kinh doanh"}
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
          {rolesOf(user).length ? (
            <p className="mt-1 text-xs font-medium text-[var(--color-sidebar-active-fg)]">
              {rolesOf(user).map((r) => ROLE_LABELS[r]).join(" · ")}
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
          loading={loggingOut}
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
