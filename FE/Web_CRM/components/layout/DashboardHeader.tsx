"use client";

import { NotificationBell } from "@/components/layout/NotificationBell";

export function DashboardHeader({ showNotifications = false }: { showNotifications?: boolean }) {
  if (!showNotifications) return null;

  return (
    <header className="sticky top-0 z-20 -mx-6 -mt-6 mb-6 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]/95 px-6 py-4 backdrop-blur">
      <div className="flex justify-end">
        <NotificationBell />
      </div>
    </header>
  );
}
