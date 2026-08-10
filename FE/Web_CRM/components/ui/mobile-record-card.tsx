import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Stack of record cards — visible below `md`, hidden on desktop table layouts */
export function MobileCardList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("crm-stagger-list flex flex-col gap-3 md:hidden", className)}
      {...props}
    />
  );
}

export function MobileRecordCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <article
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)]",
        className
      )}
      {...props}
    />
  );
}

type MobileRecordCardHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Status tags / compact controls — top-right of the card */
  trailing?: ReactNode;
};

/** Lightweight title row (no heavy divider). Prefer inline title+Badge for new cards. */
export function MobileRecordCardHeader({
  title,
  subtitle,
  trailing,
}: MobileRecordCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="font-semibold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-0.5 truncate text-sm text-[var(--color-text-inverse)]">
            {subtitle}
          </div>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

type MobileStatTileProps = {
  label: string;
  children: ReactNode;
  className?: string;
  valueClassName?: string;
};

/** Muted metric tile — label (10px uppercase) + semibold tabular value */
export function MobileStatTile({
  label,
  children,
  className,
  valueClassName,
}: MobileStatTileProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-[var(--color-surface-muted)] px-3 py-2",
        className
      )}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-inverse)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-base font-semibold tabular-nums text-[var(--color-text-primary)]",
          valueClassName
        )}>
        {children}
      </p>
    </div>
  );
}

type MobileMediaCardProps = {
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  mediaClassName?: string;
};

/** Media-first mobile card: thumbnail left, content + badge right */
export function MobileMediaCard({
  media,
  title,
  subtitle,
  badge,
  meta,
  children,
  actions,
  className,
  mediaClassName,
}: MobileMediaCardProps) {
  return (
    <article
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3 shadow-[var(--shadow-soft)]",
        className
      )}>
      <div className="flex gap-3">
        <div
          className={cn(
            "relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]",
            mediaClassName
          )}>
          {media}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-text-primary)]">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--color-text-inverse)]">
                  {subtitle}
                </div>
              ) : null}
            </div>
            {badge ? <div className="shrink-0 pt-0.5">{badge}</div> : null}
          </div>
          {meta ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">{meta}</div>
          ) : null}
        </div>
      </div>
      {children ? (
        <div className="mt-3 space-y-2 border-t border-[var(--color-border-subtle)] pt-3">
          {children}
        </div>
      ) : null}
      {actions ? (
        <div className="mt-3.5 flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3.5">
          {actions}
        </div>
      ) : null}
    </article>
  );
}

export function MobileMetaChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-md bg-[var(--color-surface-muted)] px-2.5 py-1 text-[13px] font-medium leading-none text-[var(--color-text-primary)]",
        className
      )}>
      {children}
    </span>
  );
}

type MobileRecordRowProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function MobileRecordRow({ label, children, className }: MobileRecordRowProps) {
  return (
    <div
      className={cn(
        "grid gap-1 py-2.5 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-3",
        className
      )}>
      <span className="text-xs font-medium text-[var(--color-text-inverse)]">{label}</span>
      <div className="min-w-0 text-sm text-[var(--color-text-primary)]">{children}</div>
    </div>
  );
}

export function MobileRecordActions({
  children,
  divider = true,
  className,
}: {
  children: ReactNode;
  /** Hide when the section above already ends with a divider (e.g. border-y metrics). */
  divider?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-3.5 flex flex-wrap justify-end gap-2",
        divider && "border-t border-[var(--color-border-subtle)] pt-3.5",
        className
      )}>
      {children}
    </div>
  );
}
