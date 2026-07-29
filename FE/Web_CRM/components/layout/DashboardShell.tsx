"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { NotificationProvider } from "@/lib/notifications/NotificationProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccessPath } from "@/lib/auth/permissions";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <ConfirmProvider>
      <NotificationProvider>
        <div className="flex min-h-[100dvh] bg-[var(--color-surface-muted)]">
          <Sidebar
            mobileOpen={mobileMenuOpen}
            onMobileOpenChange={setMobileMenuOpen}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <DashboardHeader onOpenMenu={() => setMobileMenuOpen(true)} />
            <main className="flex-1 overflow-x-hidden overflow-y-auto pb-[calc(3.75rem+env(safe-area-inset-bottom))] lg:pb-0">
              <div className="w-full max-w-[1600px] space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-5 lg:p-6">
                {children}
              </div>
            </main>
          </div>
          <MobileBottomNav onOpenMenu={() => setMobileMenuOpen(true)} />
        </div>
      </NotificationProvider>
    </ConfirmProvider>
  );
}
