"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MessageSquare } from "@/components/ui/icons";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useAuth } from "@/lib/auth/AuthProvider";
import { hasRole, rolesOf } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

type ChatUiContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const ChatUiContext = createContext<ChatUiContextValue | null>(null);

function useCanUseChat() {
  const { user } = useAuth();
  return hasRole(rolesOf(user), "admin");
}

export function useChatUi() {
  return useContext(ChatUiContext);
}

function ChatTriggerButton({
  className,
  onClick,
  open,
}: {
  className?: string;
  onClick: () => void;
  open: boolean;
}) {
  return (
    <button
      type="button"
      aria-label="Mở trợ lý AI"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]",
        open && "bg-[var(--color-surface-muted)]",
        className
      )}
    >
      <MessageSquare className="h-5 w-5" />
    </button>
  );
}

/** Nút AI trên header — cùng hàng chuông thông báo (mobile + desktop). */
export function ChatHeaderButton() {
  const chat = useChatUi();
  if (!chat) return null;
  return (
    <ChatTriggerButton open={chat.open} onClick={chat.toggle} />
  );
}

/** Provider + panel. Chỉ mount khi user là admin. */
export function ChatWidget({ children }: { children?: ReactNode }) {
  const allowed = useCanUseChat();
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const value = useMemo(
    () => ({ open, setOpen, toggle }),
    [open, toggle]
  );

  if (!allowed) {
    return <>{children}</>;
  }

  return (
    <ChatUiContext.Provider value={value}>
      {children}
      <ChatPanel open={open} onOpenChange={setOpen} />
    </ChatUiContext.Provider>
  );
}
