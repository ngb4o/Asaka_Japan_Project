"use client";

import { AlertTriangle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

            {description ? (
              <p className="flex-1 text-sm leading-relaxed text-[var(--color-text-inverse)] sm:pt-2">
                {description}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-0 pt-0">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              variant={variant === "danger" ? "danger" : "default"}
              className="w-full sm:w-auto"
              onClick={onConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
