"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmDialogVariant = "danger" | "default";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] bg-[var(--color-surface-elevated)] p-6 shadow-[var(--shadow-elevated)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
            <div
              className={cn(
                "mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mb-0 sm:mr-4",
                variant === "danger"
                  ? "bg-[var(--color-danger-soft-bg)] text-red-600 dark:text-red-400"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
              )}
            >
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>

            <div className="flex-1 space-y-2">
              <DialogPrimitive.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm leading-relaxed text-[var(--color-text-inverse)]">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              variant={variant === "danger" ? "danger" : "default"}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : confirmText}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
