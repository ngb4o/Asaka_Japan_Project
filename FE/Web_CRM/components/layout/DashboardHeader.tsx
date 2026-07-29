"use client";

import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";

type DashboardHeaderProps = {
  onOpenMenu?: () => void;
};

export function DashboardHeader({ onOpenMenu }: DashboardHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]/90 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex h-12 items-center justify-between gap-3 px-3 sm:h-14 sm:px-4 md:px-5 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 lg:hidden"
            onClick={onOpenMenu}
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
              ASAKA CRM
            </p>
            <p className="hidden truncate text-xs text-[var(--color-text-inverse)] sm:block">
              Hệ thống quản lý ASAKA JAPAN
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
