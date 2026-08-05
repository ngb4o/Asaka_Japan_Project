"use client";

import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ChatHeaderButton } from "@/components/chat/ChatWidget";
import { useMobileChrome } from "@/components/layout/MobileChromeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  onOpenMenu?: () => void;
};

export function DashboardHeader({ onOpenMenu }: DashboardHeaderProps) {
  const { visible } = useMobileChrome();

  return (
    <header
      className={cn(
        "z-30 shrink-0 overflow-hidden border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]/90 backdrop-blur-md transition-[max-height,border-color,opacity] duration-300 ease-out lg:max-h-none lg:opacity-100",
        visible
          ? "max-h-28 opacity-100"
          : "max-lg:max-h-0 max-lg:border-transparent max-lg:opacity-0"
      )}
      aria-hidden={!visible}
    >
      <div style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex h-12 items-center justify-between gap-3 px-3 sm:h-14 sm:px-4 md:px-5 lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 lg:hidden"
              onClick={onOpenMenu}
              aria-label="Mở menu"
              tabIndex={visible ? undefined : -1}
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
            <ChatHeaderButton />
            <NotificationBell />
          </div>
        </div>
      </div>
    </header>
  );
}
