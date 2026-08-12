import type { ReactNode } from "react";
import { Inbox } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  /** Primary message, e.g. "Chưa có đơn hàng" */
  title: string;
  description?: string;
  /** Defaults to Inbox icon */
  icon?: ReactNode;
  /** Hide the icon circle */
  hideIcon?: boolean;
  action?: ReactNode;
  className?: string;
  /** `sm` for nested cards; `md` for list panels */
  size?: "sm" | "md";
};

export function EmptyState({
  title,
  description,
  icon,
  hideIcon = false,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const compact = size === "sm";

  return (
    <div
      role="status"
      className={cn(
        "crm-enter flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]/40 text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-12",
        className
      )}>
      {hideIcon ? null : (
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-text-inverse)] shadow-sm ring-1 ring-[var(--color-border-subtle)]",
            compact ? "h-10 w-10" : "h-12 w-12"
          )}>
          {icon ?? (
            <Inbox
              className={cn(compact ? "h-4 w-4" : "h-5 w-5")}
              aria-hidden
            />
          )}
        </div>
      )}
      <div className="max-w-sm space-y-1">
        <p
          className={cn(
            "font-medium text-[var(--color-text-primary)]",
            compact ? "text-sm" : "text-sm sm:text-[16px]"
          )}>
          {title}
        </p>
        {description ? (
          <p className="text-sm text-[var(--color-text-inverse)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
