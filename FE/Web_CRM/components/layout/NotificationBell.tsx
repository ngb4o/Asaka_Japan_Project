"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import {
  AlertTriangle,
  Bell,
  Handshake,
  MessageSquare,
  ShoppingCart,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { useToast } from "@/components/providers/ToastProvider";
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
  stock: {
    icon: AlertTriangle,
    tone: "bg-red-500/10 text-red-600",
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

export function NotificationBell() {
  const router = useRouter();
  const toast = useToast();
  const {
    unreadCount,
    items,
    markAllRead,
    refresh,
    push,
    enablePush,
    disablePush,
    testPush,
  } = useNotifications();

  async function handleOpenChange(open: boolean) {
    if (open) {
      await refresh();
    }
  }

  async function handleItemClick(item: AppNotification) {
    router.push(item.href);
  }

  async function handleTogglePush() {
    try {
      if (push.enabled) {
        await disablePush();
        toast.success("Đã tắt thông báo đẩy trên thiết bị này");
      } else {
        await enablePush();
        toast.success(
          "Đã bật thông báo đẩy — kiểm tra màn hình khóa xem có tin thử không"
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không thay đổi được thông báo đẩy"
      );
    }
  }

  async function handleTestPush() {
    try {
      const result = await testPush();
      if (result.sent > 0) {
        toast.success(`Đã gửi tin thử (${result.sent}/${result.total}). Kiểm tra màn hình khóa.`);
      } else {
        toast.error(
          "Server không gửi được tới thiết bị. Thử Tắt → Bật lại thông báo (mở từ Home Screen trên iPhone)."
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gửi thử thất bại"
      );
    }
  }

  return (
    <Popover.Root onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Thông báo"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(92vw,380px)] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-2 shadow-[var(--shadow-elevated)]"
        >
          <div className="flex items-center justify-between px-2 py-2">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Thông báo
              </p>
              <p className="text-xs text-[var(--color-text-inverse)]">
                {unreadCount > 0
                  ? `${unreadCount} mục chưa đọc`
                  : "Không có mục chưa đọc"}
              </p>
            </div>
            {unreadCount > 0 ? (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                Đánh dấu đã đọc
              </Button>
            ) : null}
          </div>

          {push.supported ? (
            <div className="mx-2 mb-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]/50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    Thông báo đẩy
                  </p>
                  <p className="text-xs text-[var(--color-text-inverse)]">
                    {push.enabled
                      ? "Đang bật trên thiết bị này"
                      : push.permission === "denied"
                        ? "Đã bị chặn — mở lại trong Cài đặt → Thông báo"
                        : "Tự hỏi quyền khi vào app — hoặc bấm Bật"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={push.enabled ? "outline" : "default"}
                  disabled={push.busy || push.permission === "denied"}
                  onClick={() => void handleTogglePush()}
                >
                  {push.busy ? "…" : push.enabled ? "Tắt" : "Bật"}
                </Button>
              </div>
              {push.enabled ? (
                <button
                  type="button"
                  disabled={push.busy}
                  onClick={() => void handleTestPush()}
                  className="mt-2 text-xs font-medium text-[var(--color-text-secondary)] underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Gửi tin thử tới máy này
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mx-2 mb-2 rounded-lg border border-dashed border-[var(--color-border-subtle)] px-3 py-2 text-xs text-[var(--color-text-inverse)]">
              {push.blockReason ||
                "Thiết bị này không hỗ trợ Web Push. Trên iOS cần mở app từ Home Screen (iOS 16.4+)."}
            </div>
          )}

          <div className="max-h-[420px] space-y-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="rounded-lg px-3 py-8 text-center text-sm text-[var(--color-text-inverse)]">
                Chưa có thông báo mới
              </div>
            ) : (
              items.map((item) => {
                const meta = TYPE_META[item.type];
                const Icon = meta.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[var(--color-surface-muted)]",
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
              })
            )}
          </div>

          <div className="mt-2 border-t border-[var(--color-border-subtle)] px-2 pt-2">
            <Link
              href="/dashboard"
              className="block rounded-lg px-2 py-2 text-center text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            >
              Xem tổng quan
            </Link>
          </div>

          <Popover.Arrow className="fill-[var(--color-surface-elevated)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
