"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ToastViewport,
  type ToastItem,
  type ToastVariant,
} from "@/components/ui/toast";

export type NotifyOptions = {
  title?: string;
  description?: string;
  duration?: number;
};

type ToastContextValue = {
  notify: (variant: ToastVariant, message: string, options?: NotifyOptions) => string;
  success: (message: string, options?: NotifyOptions) => string;
  error: (message: string, options?: NotifyOptions) => string;
  info: (message: string, options?: NotifyOptions) => string;
  warning: (message: string, options?: NotifyOptions) => string;
  dismiss: (id: string) => void;
};

const DEFAULT_TITLES: Record<ToastVariant, string> = {
  success: "Thành công",
  error: "Thất bại",
  info: "Thông báo",
  warning: "Cảnh báo",
};

const DEFAULT_DURATION = 3800;

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSeq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (variant: ToastVariant, message: string, options?: NotifyOptions) => {
      const id = `toast-${++toastSeq}`;
      const duration = options?.duration ?? DEFAULT_DURATION;

      const nextItem: ToastItem = {
        id,
        variant,
        title: options?.title ?? DEFAULT_TITLES[variant],
        description: options?.description ?? message,
        duration,
      };

      setToasts((prev) => [...prev, nextItem].slice(-5));

      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (message, options) => notify("success", message, options),
      error: (message, options) => notify("error", message, options),
      info: (message, options) => notify("info", message, options),
      warning: (message, options) => notify("warning", message, options),
      dismiss,
    }),
    [notify, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
