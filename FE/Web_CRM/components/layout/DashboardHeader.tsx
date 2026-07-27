"use client";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-5 lg:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
            Hệ thống quản lý ASAKA JAPAN
          </p>
          <p className="truncate text-xs text-[var(--color-text-inverse)]">
            CRM - Sales - Inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
