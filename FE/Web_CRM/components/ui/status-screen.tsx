"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StatusScreenVariant = "not-found" | "error" | "offline" | "network";

type StatusScreenProps = {
  variant?: StatusScreenVariant;
  code?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  /** Full viewport (default). Use false inside dashboard shell. */
  fullPage?: boolean;
  className?: string;
  /** Hide ASAKA brand mark */
  hideBrand?: boolean;
};

const VARIANT_ACCENT: Record<StatusScreenVariant, string> = {
  "not-found": "bg-[var(--color-text-secondary)]/12 text-[var(--color-text-secondary)]",
  error: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
  offline: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  network: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
};

export function StatusScreen({
  variant = "error",
  code,
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  fullPage = true,
  className,
  hideBrand = false,
}: StatusScreenProps) {
  return (
    <div
      role="alert"
      className={cn(
        "crm-enter relative flex w-full flex-col items-center justify-center px-5 text-center",
        fullPage
          ? "crm-ios-fill min-h-[100dvh] bg-[var(--color-surface-base)] py-10"
          : "min-h-[min(70vh,520px)] py-12",
        className
      )}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-[var(--color-text-secondary)]/8 blur-3xl" />
        <div className="absolute -right-20 bottom-8 h-56 w-56 rounded-full bg-[var(--color-text-secondary)]/6 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-5">
        {!hideBrand ? (
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-1 shadow-[var(--shadow-soft)]">
              <Image
                src="/images/brand/logo.png"
                alt="ASAKA"
                width={80}
                height={80}
                className="h-full w-full object-contain"
              />
            </span>
            <p className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
              ASAKA CRM
            </p>
          </div>
        ) : null}

        <div
          className={cn(
            "inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border-subtle)]",
            VARIANT_ACCENT[variant]
          )}>
          {icon}
        </div>

        {code ? (
          <p className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-semibold tracking-wide text-[var(--color-text-inverse)]">
            {code}
          </p>
        ) : null}

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-relaxed text-[var(--color-text-inverse)]">
              {description}
            </p>
          ) : null}
        </div>

        {(primaryAction || secondaryAction) && (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {primaryAction}
            {secondaryAction}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusHomeButton({
  href = "/dashboard",
  label = "Về trang chủ",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Button asChild className="w-full sm:w-auto">
      <Link href={href}>{label}</Link>
    </Button>
  );
}

export function StatusRetryButton({
  onClick,
  label = "Thử lại",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClick}>
      {label}
    </Button>
  );
}
