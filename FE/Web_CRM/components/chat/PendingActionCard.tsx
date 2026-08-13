"use client";

import { Button } from "@/components/ui/button";
import type { PendingConfirmation } from "@/lib/api/chat";
import { cn } from "@/lib/utils";

type PendingActionCardProps = {
  pending: PendingConfirmation;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
};

export function PendingActionCard({
  pending,
  busy,
  onConfirm,
  onCancel,
  className,
}: PendingActionCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 text-sm text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
        className
      )}>
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        Cần xác nhận
      </p>
      <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">
        {pending.preview}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={onCancel}>
          Hủy
        </Button>
        <Button type="button" size="sm" loading={busy} onClick={onConfirm}>
          Xác nhận
        </Button>
      </div>
    </div>
  );
}
