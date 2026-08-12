"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function toTelHref(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : undefined;
}

type SmartTextBaseProps = {
  value?: string | null;
  children?: ReactNode;
  className?: string;
  title?: string;
};

type CopyableProps = SmartTextBaseProps & {
  /** Shown in toast, e.g. "Mã đơn" → "Đã sao chép mã đơn" */
  label?: string;
};

/** Tap / click to copy — order codes, tracking, etc. */
export function Copyable({
  value,
  children,
  className,
  label = "nội dung",
  title,
}: CopyableProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const text = String(value || "").trim();
  if (!text) return null;

  const onCopy = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const ok = await writeClipboard(text);
    if (!ok) {
      toast.error("Không sao chép được. Thử lại.");
      return;
    }
    setCopied(true);
    toast.success(`Đã sao chép ${label}`);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title={title || `Sao chép ${label}`}
      aria-label={title || `Sao chép ${label}`}
      data-copied={copied ? "true" : undefined}
      className={cn(
        "inline-flex max-w-full items-center text-left transition-colors",
        "hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]",
        "active:scale-[0.98]",
        className
      )}>
      <span className="min-w-0 truncate underline decoration-[var(--color-border-subtle)] decoration-dashed underline-offset-4 hover:decoration-[var(--color-text-secondary)]/50">
        {children ?? text}
      </span>
    </button>
  );
}

/** Tap / click to place a phone call */
export function PhoneLink({
  value,
  children,
  className,
  title,
}: SmartTextBaseProps) {
  const text = String(value || "").trim();
  const href = toTelHref(text);
  if (!text || !href) return null;

  return (
    <a
      href={href}
      title={title || `Gọi ${text}`}
      aria-label={title || `Gọi ${text}`}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "inline-flex max-w-full items-center text-left transition-colors",
        "hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]",
        "active:scale-[0.98]",
        className
      )}>
      <span className="min-w-0 truncate underline decoration-[var(--color-border-subtle)] decoration-dashed underline-offset-4 hover:decoration-[var(--color-text-secondary)]/50">
        {children ?? text}
      </span>
    </a>
  );
}

/** Convenience: copy order / trip / document code */
export function CodeText({ value, label = "mã", className }: CopyableProps) {
  return <Copyable value={value} label={label} className={className} />;
}

/** Convenience: copy tracking / shipping code */
export function TrackingText({
  value,
  className,
  prefix,
}: CopyableProps & { prefix?: string }) {
  const text = String(value || "").trim();
  if (!text) return null;
  return (
    <Copyable value={text} label="mã vận đơn" className={className}>
      {prefix ? `${prefix}${text}` : text}
    </Copyable>
  );
}
