"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useMobileChrome } from "@/components/layout/MobileChromeProvider";
import { cn } from "@/lib/utils";

export type PageHeaderFab = {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Mobile floating action button(s) — typically create. Hidden from md up. */
  fab?: PageHeaderFab | PageHeaderFab[] | null;
  className?: string;
};

function FabButton({
  onClick,
  label,
  disabled,
  loading,
  icon,
  primary,
}: PageHeaderFab & { primary?: boolean }) {
  return (
    <Button
      type="button"
      size="lg"
      variant={primary ? "default" : "outline"}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      aria-label={label}
      title={label}
      className={cn(
        "h-11 w-11 rounded-xl p-0 shadow-md",
        primary
          ? "shadow-[0_6px_16px_rgba(1,125,3,0.28)]"
          : "border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[0_6px_16px_rgba(0,0,0,0.1)]"
      )}>
      {icon ?? <Plus className="h-5 w-5" />}
    </Button>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  fab,
  className,
}: PageHeaderProps) {
  const { visible: chromeVisible } = useMobileChrome();
  const fabs = fab == null ? [] : Array.isArray(fab) ? fab : [fab];
  const hasFab = fabs.length > 0;
  const hasDesktopChrome = Boolean(title || description || actions);

  return (
    <>
      {hasDesktopChrome ? (
        <div
          className={cn(
            "hidden flex-col gap-3 md:flex md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-4",
            className
          )}>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm text-[var(--color-text-inverse)]">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex w-auto flex-wrap items-center justify-end gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasFab ? (
        <div
          className={cn(
            "pointer-events-none fixed z-50 flex flex-col-reverse items-end gap-3 transition-all duration-300 ease-out md:hidden",
            chromeVisible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-6 opacity-0"
          )}
          style={{
            right: "max(1rem, env(safe-area-inset-right))",
            bottom: chromeVisible
              ? "calc(3rem + env(safe-area-inset-bottom, 0px) + 1rem)"
              : "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
          }}
          aria-hidden={!chromeVisible}>
          {fabs.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className={cn(
                "pointer-events-auto",
                !chromeVisible && "pointer-events-none"
              )}>
              <FabButton {...item} primary={index === 0} />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
