"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  className?: string;
  maxHeight?: string;
};

const EXIT_MS = 320;

/**
 * Suspend Radix Dialog layers while a sheet is open so focus + touch
 * reach the portaled sheet (modal dialogs set pointer-events:none on body
 * and trap focus inside dialog content).
 */
function useSuspendDialogLayers(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-radix-dialog-content], [data-radix-dialog-overlay], [data-radix-dialog-overlay-wrapper]"
      )
    );

    const prev = nodes.map((node) => ({
      node,
      inert: node.inert,
      pointerEvents: node.style.pointerEvents,
    }));

    nodes.forEach((node) => {
      node.inert = true;
      node.style.pointerEvents = "none";
    });

    document.body.setAttribute("data-bottom-sheet-open", "");

    return () => {
      prev.forEach(({ node, inert, pointerEvents }) => {
        node.inert = inert;
        node.style.pointerEvents = pointerEvents;
      });
      document.body.removeAttribute("data-bottom-sheet-open");
    };
  }, [active]);
}

/**
 * Mobile bottom sheet — portaled to document.body.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  className,
  maxHeight = "80dvh",
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  /** After open animation, drop CSS transform so iOS can scroll inside. */
  const [settled, setSettled] = useState(false);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useSuspendDialogLayers(mounted && entered);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setSettled(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(id);
    }

    // Re-enable transform at rest position, then slide down.
    setSettled(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(false));
    });
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS + 32);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !entered || settled) return;
    const timer = window.setTimeout(() => setSettled(true), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, entered, settled]);

  useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  function handlePanelTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;
    if (open && entered) {
      setSettled(true);
      return;
    }
    if (!open) setMounted(false);
  }

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-bottom-sheet=""
      data-state={entered ? "open" : "closed"}
      className="pointer-events-auto fixed inset-0 z-[200]"
      style={{ pointerEvents: "auto" }}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Chọn"}
    >
      <div
        aria-label="Đóng"
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-300 ease-out",
          entered ? "opacity-100" : "opacity-0"
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (entered) close();
        }}
      />

      {/*
        Height hugs content; caps at maxHeight (default 80dvh).
        Shell stays transform-free when settled (iOS won't scroll inside
        transformed ancestors).
      */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex max-h-[80dvh] flex-col overflow-hidden"
        style={{ maxHeight }}
      >
        <div
          className={cn(
            "flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-t-2xl bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-[0_-12px_40px_rgba(0,0,0,0.22)]",
            !settled &&
              "origin-bottom will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            !settled && (entered ? "translate-y-0" : "translate-y-full"),
            className
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          onTransitionEnd={handlePanelTransitionEnd}
        >
          <div className="flex shrink-0 flex-col items-center pt-2">
            <div
              className="mb-1 h-1 w-10 rounded-full bg-[var(--color-border-subtle)]"
              aria-hidden
            />
            {title ? (
              <div className="relative flex w-full items-center justify-center border-b border-[var(--color-border-subtle)] px-12 pb-3 pt-1">
                <p className="truncate text-center text-base font-semibold tracking-tight">
                  {title}
                </p>
                <button
                  type="button"
                  aria-label="Đóng"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    close();
                  }}
                  className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : null}
          </div>

          <div
            className="min-h-0 overflow-y-auto overscroll-contain"
            style={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
