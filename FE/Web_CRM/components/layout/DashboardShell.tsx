"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { NotificationProvider } from "@/lib/notifications/NotificationProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccessPath } from "@/lib/auth/permissions";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
        <div className="flex min-h-screen bg-[var(--color-surface-muted)]">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <DashboardHeader />
            <main className="flex-1 overflow-auto">
              <div className="w-full space-y-5 p-4 md:p-5 lg:p-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </NotificationProvider>
    </ConfirmProvider>
  );
}
