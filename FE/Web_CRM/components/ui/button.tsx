import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-muted)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-text-secondary)] text-[var(--color-text-tertiary)] shadow-sm hover:bg-[#016502] dark:hover:bg-[#029405]",
        outline:
          "border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-sm hover:bg-[var(--color-surface-muted)]",
        ghost: "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]",
        danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        /** Icon actions — soft tinted chips */
        view:
          "border border-sky-200/90 bg-sky-50 text-sky-700 shadow-sm hover:bg-sky-100 dark:border-sky-500/35 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25",
        edit:
          "border border-amber-200/90 bg-amber-50 text-amber-800 shadow-sm hover:bg-amber-100 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25",
        success:
          "border border-emerald-200/90 bg-emerald-50 text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25",
        /** Soft red — từ chối / hủy nhẹ (khác danger đặc) */
        reject:
          "border border-rose-200/90 bg-rose-50 text-rose-700 shadow-sm hover:bg-rose-100 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25",
        /** In PDF */
        print:
          "border border-cyan-200/90 bg-cyan-50 text-cyan-700 shadow-sm hover:bg-cyan-100 dark:border-cyan-500/35 dark:bg-cyan-500/15 dark:text-cyan-300 dark:hover:bg-cyan-500/25",
        /** Thu tiền / ghi nhận thanh toán */
        pay:
          "border border-teal-200/90 bg-teal-50 text-teal-700 shadow-sm hover:bg-teal-100 dark:border-teal-500/35 dark:bg-teal-500/15 dark:text-teal-300 dark:hover:bg-teal-500/25",
        mute:
          "border border-slate-200/90 bg-slate-50 text-slate-600 shadow-sm hover:bg-slate-100 dark:border-slate-500/35 dark:bg-slate-500/15 dark:text-slate-300 dark:hover:bg-slate-500/25",
      },
      size: {
        default: "h-10 px-4 text-sm rounded-[var(--radius-button)]",
        sm: "h-8 px-3 text-xs rounded-[var(--radius-button)]",
        lg: "h-11 px-5 text-sm rounded-[var(--radius-button)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Replaces content with a loading circle and disables the button. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;
    const spinnerClass = cn(
      "animate-spin",
      size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
    );

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size }), className)}
          ref={ref}
          {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}>
        <span
          className={cn(
            "inline-flex items-center justify-center gap-2",
            loading && "invisible"
          )}
          aria-hidden={loading || undefined}>
          {children}
        </span>
        {loading ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 className={spinnerClass} aria-hidden="true" />
          </span>
        ) : null}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
