"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error("Dialog components must be used within <Dialog>");
  }
  return ctx;
}

function Dialog({
  open: openProp,
  defaultOpen,
  onOpenChange,
  modal,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const isMobile = useIsMobile();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false
  );
  const isControlled = openProp !== undefined;
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  return (
    <DialogContext.Provider
      value={{ open, onOpenChange: handleOpenChange, isMobile }}
    >
      <DialogPrimitive.Root
        open={open}
        onOpenChange={handleOpenChange}
        // Non-modal on mobile: content is a BottomSheet portal; nested selects
        // also need to receive focus/pointer events.
        modal={modal ?? !isMobile}
        {...props}
      >
        {children}
      </DialogPrimitive.Root>
    </DialogContext.Provider>
  );
}

const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
  /**
   * When true (default), content scrolls under a sticky header.
   * Set false for custom layouts that manage their own scroll regions.
   */
  bodyScroll?: boolean;
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      bodyScroll = true,
      onPointerDownOutside,
      onInteractOutside,
      onFocusOutside,
      style,
      ...props
    },
    ref
  ) => {
    const { open, onOpenChange, isMobile } = useDialogContext();

    function isOverlayExemptTarget(target: EventTarget | null) {
      return (
        target instanceof Element &&
        Boolean(
          target.closest("[data-radix-popover-content], [data-bottom-sheet]")
        )
      );
    }

    function retainFocusableInExemptOverlay(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return;
      const focusable = target.closest(
        "input, textarea, select, [contenteditable='true']"
      );
      if (!(focusable instanceof HTMLElement)) return;
      queueMicrotask(() => {
        focusable.focus({ preventScroll: true });
      });
    }

    const body = bodyScroll ? (
      <div
        className={cn(
          "min-h-0",
          isMobile
            ? "[&>:not([data-slot=dialog-header])]:px-4 [&>:not([data-slot=dialog-header])]:py-4"
            : cn(
                "flex-1 overflow-y-auto overscroll-contain",
                "[&>:not([data-slot=dialog-header])]:px-4 [&>:not([data-slot=dialog-header])]:py-4",
                "sm:[&>:not([data-slot=dialog-header])]:px-6 sm:[&>:not([data-slot=dialog-header])]:py-6"
              )
        )}
      >
        {children}
      </div>
    ) : (
      children
    );

    // Mobile: real BottomSheet (shared animation + dim overlay)
    if (isMobile) {
      return (
        <BottomSheet
          open={open}
          onOpenChange={onOpenChange}
          maxHeight="90dvh"
          showClose={false}
          className={cn("relative", className)}
        >
          <DialogClose className="absolute right-2.5 top-2.5 z-30 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]">
            <X className="h-4 w-4" />
            <span className="sr-only">Đóng</span>
          </DialogClose>
          {body}
        </BottomSheet>
      );
    }

    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[min(90dvh,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-0 text-[var(--color-text-primary)] shadow-[var(--shadow-elevated)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
          style={style}
          onPointerDownOutside={(event) => {
            if (isOverlayExemptTarget(event.target)) {
              event.preventDefault();
              retainFocusableInExemptOverlay(event.target);
            }
            onPointerDownOutside?.(event);
          }}
          onFocusOutside={(event) => {
            if (isOverlayExemptTarget(event.target)) {
              event.preventDefault();
            }
            onFocusOutside?.(event);
          }}
          onInteractOutside={(event) => {
            if (isOverlayExemptTarget(event.target)) {
              event.preventDefault();
            }
            onInteractOutside?.(event);
          }}
          {...props}
        >
          <DialogClose className="absolute right-2.5 top-2.5 z-30 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] sm:right-3 sm:top-3">
            <X className="h-4 w-4" />
            <span className="sr-only">Đóng</span>
          </DialogClose>

          {bodyScroll ? (
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain",
                "[&>:not([data-slot=dialog-header])]:px-4 [&>:not([data-slot=dialog-header])]:py-4",
                "sm:[&>:not([data-slot=dialog-header])]:px-6 sm:[&>:not([data-slot=dialog-header])]:py-6"
              )}
            >
              {children}
            </div>
          ) : (
            children
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-header"
    className={cn(
      "sticky top-0 z-20 flex shrink-0 items-center justify-center border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-12 py-3.5 text-center",
      className
    )}
    {...props}
  />
);

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const { isMobile } = useDialogContext();
  const titleClassName = cn(
    "text-center text-lg font-semibold leading-snug text-[var(--color-text-primary)]",
    className
  );

  // BottomSheet path has no Radix Content — use a plain heading.
  if (isMobile) {
    return <h2 ref={ref} className={titleClassName} {...props} />;
  }

  return (
    <DialogPrimitive.Title ref={ref} className={titleClassName} {...props} />
  );
});
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
};
