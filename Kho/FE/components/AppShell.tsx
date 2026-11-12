"use client";

import { FileText, LogOut, Menu, Package, Truck, Warehouse, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Sản phẩm", icon: Package },
  { href: "/kho", label: "Kho hàng", icon: Warehouse },
  { href: "/drivers", label: "Lái xe", icon: Truck },
  { href: "/phieu", label: "Phiếu", icon: FileText },
];

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
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (
    <>
      <div className="flex shrink-0 items-center gap-2.5 px-4 py-3.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm">
          <img src="/images/brand/logo.png" alt="ASAKA" className="h-full w-full object-contain" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Kho hàng</p>
          <p className="truncate text-xs text-[#8faf96]">ASAKA JAPAN</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
                active
                  ? "bg-[rgb(1_125_3_/_0.32)] text-[#86efac]"
                  : "text-[#8faf96] hover:bg-white/5 hover:text-white"
              }`}
            >
              {active ? <span className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[#86efac]" /> : null}
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
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
      <aside className="hidden h-full w-[272px] shrink-0 flex-col bg-[#0c2810] text-[#ecfdf3] lg:flex print:hidden">{nav}</aside>
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button type="button" aria-label="Đóng menu" className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <aside className="relative z-10 flex h-full w-[min(100vw-2.5rem,288px)] flex-col bg-[#0c2810] text-[#ecfdf3] shadow-2xl">
            <button
              type="button"
              aria-label="Đóng"
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10"
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            {nav}
          </aside>
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#e2e8f0] bg-white px-3 print:hidden">
          <button
            type="button"
            aria-label="Mở menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[#f1f5f9] lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="truncate text-sm font-semibold">Kho hàng</p>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">{children}</main>
      </div>
    </div>
  );
}
