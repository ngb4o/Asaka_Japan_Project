import { cn } from "@/lib/utils";

type SectionShellProps = {
  id?: string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  ariaLabel?: string;
};

export function SectionShell({
  id,
  title,
  subtitle,
  eyebrow,
  children,
  className,
  dark = false,
  ariaLabel,
}: SectionShellProps) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      aria-label={!title ? ariaLabel : undefined}
      className={cn(
        "section-padding",
        dark && "bg-[var(--color-surface-base)] text-[var(--color-text-tertiary)]",
        className
      )}
    >
      <div className="container-wide">
        {(eyebrow || title || subtitle) && (
          <header className="mb-8 max-w-3xl md:mb-9">
            {eyebrow && (
              <p
                className={cn(
                  "mb-2 text-[var(--text-sm)] font-semibold uppercase tracking-widest",
                  dark ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-secondary)]"
                )}
              >
                {eyebrow}
              </p>
            )}
            {title && (
              <h2
                id={headingId}
                className={cn(
                  "text-headline font-semibold",
                  dark ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"
                )}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={cn(
                  "mt-3 text-[var(--text-md)] font-normal leading-relaxed",
                  dark ? "text-white/75" : "text-[var(--color-text-inverse)]"
                )}
              >
                {subtitle}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
