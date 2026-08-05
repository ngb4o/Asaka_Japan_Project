"use client";

import { forwardRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import {
  AlertTriangle,
  Bell,
  Handshake,
  MessageSquare,
  Route,
  ShoppingCart,
  Wallet,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import type { AppNotification } from "@/lib/types";

const TYPE_META: Record<
  AppNotification["type"],
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  lead: {
    icon: MessageSquare,
    tone: "bg-blue-500/10 text-blue-600",
  },
  dealer_lead: {
    icon: Handshake,
    tone: "bg-emerald-500/10 text-emerald-600",
  },
  dealer: {
    icon: Handshake,
    tone: "bg-amber-500/10 text-amber-600",
  },
  order: {
    icon: ShoppingCart,
    tone: "bg-violet-500/10 text-violet-600",
  },
  payment: {
    icon: Wallet,
    tone: "bg-emerald-500/10 text-emerald-700",
  },
  stock: {
    icon: AlertTriangle,
    tone: "bg-red-500/10 text-red-600",
  },
  trip: {
    icon: Route,
    tone: "bg-teal-500/10 text-teal-700",
  },
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationList({
  items,
  unreadCount,
  onMarkAllRead,
  onItemClick,
  compact,
  markingAllRead,
}: {
  items: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onItemClick: (item: AppNotification) => void;
  compact?: boolean;
  markingAllRead?: boolean;
}) {
  return (
    <div>
      {compact || unreadCount > 0 ? (
        <div
          className={cn(
            "flex items-center gap-3 border-b border-[var(--color-border-subtle)]",
            compact ? "justify-between px-3 py-2.5" : "justify-end px-4 py-2.5"
          )}
        >
          {compact ? (
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Thông báo
            </p>
          ) : null}
          {unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              loading={markingAllRead}
              onClick={onMarkAllRead}
            >
              Đánh dấu đã đọc
            </Button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-y-auto",
          compact ? "max-h-[420px]" : "max-h-[min(60dvh,480px)]"
        )}
      >
        {items.length === 0 ? (
          <EmptyState title="Chưa có thông báo mới" size="sm" className="m-3" />
        ) : (
          <div
            role="list"
            className="divide-y divide-[var(--color-border-subtle)]"
          >
            {items.map((item) => {
              const meta = TYPE_META[item.type] || TYPE_META.order;
              const Icon = meta.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
                  onClick={() => onItemClick(item)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-surface-muted)]",
                    item.unread && "bg-[var(--color-text-secondary)]/5"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      meta.tone
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {item.title}
                      </span>
                      {item.unread ? (
                        <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block whitespace-pre-line text-sm text-[var(--color-text-inverse)]">
                      {item.message}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--color-text-inverse)]/80">
                      {formatTime(item.createdAt)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const BellButton = forwardRef<
  HTMLButtonElement,
  {
    unreadCount: number;
    onClick?: () => void;
  }
>(function BellButton({ unreadCount, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Thông báo"
      onClick={onClick}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
});
BellButton.displayName = "BellButton";

export function NotificationBell() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const { unreadCount, items, markAllRead, markRead, refresh } =
    useNotifications();

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      await refresh();
    }
  }

  async function handleMarkAllRead() {
    setMarkingAllRead(true);
    try {
      await markAllRead();
    } finally {
      setMarkingAllRead(false);
    }
  }

  function handleItemClick(item: AppNotification) {
    if (item.unread) {
      void markRead(item.id);
    }
    setOpen(false);
    router.push(item.href);
  }

  if (isMobile) {
    return (
      <>
        <BellButton
          unreadCount={unreadCount}
          onClick={() => void handleOpenChange(true)}
        />
        <BottomSheet
          open={open}
          onOpenChange={(next) => void handleOpenChange(next)}
          title="Thông báo"
          maxHeight="85dvh"
        >
          <NotificationList
            items={items}
            unreadCount={unreadCount}
            onMarkAllRead={() => void handleMarkAllRead()}
            onItemClick={handleItemClick}
            markingAllRead={markingAllRead}
          />
        </BottomSheet>
      </>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={(next) => void handleOpenChange(next)}>
      <Popover.Trigger asChild>
        <BellButton unreadCount={unreadCount} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(92vw,380px)] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-0 shadow-[var(--shadow-elevated)]"
        >
          <NotificationList
            items={items}
            unreadCount={unreadCount}
            onMarkAllRead={() => void handleMarkAllRead()}
            onItemClick={handleItemClick}
            markingAllRead={markingAllRead}
            compact
          />
          <Popover.Arrow className="fill-[var(--color-surface-elevated)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
