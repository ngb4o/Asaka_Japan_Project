import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-crm-card=""
    className={cn(
      "w-full rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)] transition-shadow",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Keep header visible on mobile (default hidden — list titles). */
  showOnMobile?: boolean;
};

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, showOnMobile = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-0.5 border-b border-[var(--color-border-subtle)] px-4 py-3",
        !showOnMobile && "max-lg:hidden",
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-semibold tracking-tight text-[var(--color-text-primary)]",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-4 max-lg:px-3 max-lg:pb-2.5 max-lg:pt-2.5", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
