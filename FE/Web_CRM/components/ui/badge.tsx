"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]",
        success: "bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-fg)]",
        muted: "bg-[var(--color-badge-muted-bg)] text-[var(--color-badge-muted-fg)]",
        warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
        danger: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
