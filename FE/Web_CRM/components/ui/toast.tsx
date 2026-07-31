"use client";

import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration: number;
};

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; accent: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    accent: "border-l-[var(--color-text-secondary)]",
    iconClass: "text-[var(--color-text-secondary)]",
  },
  error: {
    icon: CircleAlert,
    accent: "border-l-red-500",
    iconClass: "text-red-500",
  },
  warning: {
    icon: TriangleAlert,
    accent: "border-l-amber-500",
    iconClass: "text-amber-500",
  },
  info: {
    icon: Info,
    accent: "border-l-sky-500",
    iconClass: "text-sky-500",
  },
};

type ToastCardProps = {
  toast: ToastItem;
  onDismiss: (id: string) => void;
};

export function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const config = VARIANT_STYLES[toast.variant];
  const Icon = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto relative flex w-full max-w-sm gap-3 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] border-l-4 bg-[var(--color-surface-elevated)] p-3.5 shadow-[var(--shadow-elevated)]",
        "animate-[toast-in_0.28s_cubic-bezier(0.16,1,0.3,1)_both]",
        config.accent
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.iconClass)} />
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          {toast.title}
        </p>
        {toast.description ? (
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--color-text-inverse)]">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Đóng thông báo"
        onClick={() => onDismiss(toast.id)}
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

type ToastViewportProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100vw-2rem,24rem)] flex-col-reverse gap-2.5"
      aria-label="Thông báo"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
