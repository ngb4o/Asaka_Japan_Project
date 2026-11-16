"use client";

import { ChevronDown, CircleDot, Droplet, FileText, LogOut, Package, Truck, Warehouse } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { OfflineBar } from "@/components/OfflineBar";
import { OfflineWarmup } from "@/components/OfflineWarmup";

const STORAGE_KEY = "kho_nav_open_groups";

const NAV_GROUPS = [
  {
    id: "kho",
    label: "Sản phẩm & Kho",
    icon: Package,
    items: [
      { href: "/", label: "Sản phẩm", icon: Package },
      { href: "/kho", label: "Kho hàng", icon: Warehouse },
    ],
  },
  {
    id: "xe",
    label: "Xe",
    icon: Truck,
    items: [
      { href: "/lop", label: "Lốp", icon: CircleDot },
      { href: "/dau", label: "Thay dầu", icon: Droplet },
      { href: "/drivers", label: "Lái xe", icon: Truck },
    ],
  },
  {
    id: "phieu",
    label: "Phiếu",
    icon: FileText,
    items: [{ href: "/phieu", label: "Phiếu", icon: FileText }],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  accountName,
  onLogout,
  children,
}: {
  accountName: string;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const onOnline = () => setReloadKey((value) => value + 1);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ kho: true });

  useEffect(() => {
    const activeIds = NAV_GROUPS.filter((group) => group.items.some((item) => isActivePath(pathname, item.href))).map((group) => group.id);
    setOpenGroups(() => {
      let stored: Record<string, boolean> = {};
      try {
        stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      } catch {
        stored = {};
      }
      const next = { ...stored };
      for (const group of NAV_GROUPS) {
        if (typeof next[group.id] !== "boolean") next[group.id] = group.id === "kho" || activeIds.includes(group.id);
      }
      for (const id of activeIds) next[id] = true;
      return next;
    });
  }, [pathname]);

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

  const nav = (
    <>
      <div className="flex shrink-0 items-center gap-2.5 px-4 py-3.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
          <img src="/icons/icon-192.png" alt="Kho hàng" className="h-full w-full object-contain" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Kho hàng</p>
          <p className="truncate text-xs text-[var(--color-brand-soft)]">Mai Linh Đông Đô</p>
        </div>
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const open = openGroups[group.id] ?? false;
          const groupActive = group.items.some((item) => isActivePath(pathname, item.href));
          return (
            <div key={group.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${
                  groupActive ? "bg-white/10 text-white" : "text-[var(--color-brand-soft)] hover:bg-white/5 hover:text-white"
                }`}
              >
                <GroupIcon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="min-w-0 flex-1 truncate">{group.label}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className="space-y-0.5 pb-1 pl-2">
                    {group.items.map((item) => {
                      const active = isActivePath(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                            active ? "bg-[rgb(125_182_230_/_0.22)] text-[#d7ebfa]" : "text-[var(--color-brand-soft)] hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {active ? <span className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[#7ec8f0]" /> : null}
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
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
      <div className="mt-auto shrink-0 space-y-3 border-t border-white/10 p-4">
        <p className="truncate text-sm font-semibold text-white">{accountName || "Quản kho"}</p>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-white/10 text-sm font-semibold text-white hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <div className="app-shell flex h-full w-full overflow-hidden bg-[#f1f5f9]">
      <aside className="hidden h-full w-[272px] shrink-0 flex-col bg-[var(--color-brand-ink)] text-[#e8f1fa] lg:flex print:hidden">{nav}</aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#e2e8f0] bg-white px-3 lg:hidden print:hidden">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            <img src="/icons/icon-192.png" alt="" className="h-full w-full object-contain" />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">Kho hàng</p>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Đăng xuất"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-[#64748b] hover:bg-[#f1f5f9]"
          >
            <LogOut className="h-4 w-4" />
            <span className="max-w-24 truncate">{accountName || "Đăng xuất"}</span>
          </button>
        </header>
        <OfflineWarmup />
        <OfflineBar />
        <main className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
          <div key={`${pathname}-${reloadKey}`} className="ui-page h-full min-h-0 min-w-0">
            {children}
          </div>
        </main>
        <nav aria-label="Điều hướng" className="grid shrink-0 grid-cols-6 border-t border-[#e2e8f0] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden">
          {NAV_GROUPS.flatMap((group) => group.items).map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-col items-center gap-1 px-0.5 py-1.5 text-[10px] leading-none font-semibold ${
                  active ? "text-[var(--color-text-secondary)]" : "text-[#64748b]"
                }`}
              >
                <span className={`flex h-7 w-full max-w-12 items-center justify-center rounded-full ${active ? "bg-[var(--color-brand-mist)]" : ""}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
