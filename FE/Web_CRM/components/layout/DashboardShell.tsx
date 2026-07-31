"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import {
  MobileChromeProvider,
} from "@/components/layout/MobileChromeProvider";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { NotificationProvider } from "@/lib/notifications/NotificationProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccessPath } from "@/lib/auth/permissions";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user?.role || loading) return;
    if (!canAccessPath(user.role, pathname)) {
      router.replace("/dashboard");
    }
  }, [loading, pathname, router, user?.role]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] text-sm text-[var(--color-text-inverse)]">
        Đang tải workspace...
      </div>
    );
  }

  if (!user) return null;

  const paddedMobile =
    pathname === "/dashboard" ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings");

  return (
    <ConfirmProvider>
      <NotificationProvider>
        <MobileChromeProvider scrollRef={mainRef}>
          <div className="flex h-[100dvh] overflow-hidden bg-[var(--color-surface-muted)]">
            <Sidebar
              mobileOpen={mobileMenuOpen}
              onMobileOpenChange={setMobileMenuOpen}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <DashboardHeader onOpenMenu={() => setMobileMenuOpen(true)} />
              <main
                ref={mainRef}
                className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pb-0"
              >
                <div
                  className={
                    paddedMobile
                      ? "crm-page-padded w-full max-w-[1600px] space-y-3 p-3 sm:space-y-4 sm:p-4 md:space-y-5 md:p-5 lg:p-6"
                      : "crm-page-flush w-full max-w-[1600px] space-y-0 p-0 md:space-y-5 md:p-5 lg:p-6"
                  }
                >
                  {children}
                </div>
              </main>
            </div>
            <MobileBottomNav onOpenMenu={() => setMobileMenuOpen(true)} />
          </div>
        </MobileChromeProvider>
      </NotificationProvider>
    </ConfirmProvider>
  );
}
