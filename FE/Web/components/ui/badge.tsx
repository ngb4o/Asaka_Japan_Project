import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-[var(--text-xs)] font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]",
        secondary: "bg-[var(--color-surface-muted)] text-[var(--color-text-primary)]",
        outline:
          "border border-[var(--color-border-subtle)] text-[var(--color-text-primary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
