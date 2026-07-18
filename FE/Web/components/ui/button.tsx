import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-[400ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] min-h-[44px] min-w-[44px]",
  {
    variants: {
      variant: {
        default:
          "bg-text-secondary text-text-tertiary hover:bg-[#016502] hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
        secondary:
          "bg-transparent border-2 border-text-tertiary text-text-tertiary hover:bg-white/10 hover:-translate-y-0.5",
        outline:
          "border-2 border-text-secondary text-text-secondary bg-transparent hover:bg-text-secondary hover:text-text-tertiary hover:-translate-y-0.5",
        ghost:
          "text-text-primary hover:bg-surface-muted",
        dark: "bg-surface-base text-text-tertiary hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
      },
      size: {
        default: "h-12 px-8 text-[var(--text-md)] rounded-[var(--radius-button)]",
        sm: "h-10 px-6 text-[var(--text-sm)] rounded-[var(--radius-button)]",
        lg: "h-14 px-10 text-[var(--text-lg)] rounded-[var(--radius-button)]",
        icon: "h-11 w-11 rounded-full",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
