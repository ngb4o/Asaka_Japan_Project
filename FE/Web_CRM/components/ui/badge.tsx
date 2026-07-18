import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]",
        success: "bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-fg)]",
        muted: "bg-[var(--color-badge-muted-bg)] text-[var(--color-badge-muted-fg)]",
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
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
