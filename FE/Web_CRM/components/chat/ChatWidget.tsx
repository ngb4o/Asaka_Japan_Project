"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Bot, Sparkles } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
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

function AiAssistantIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <Bot className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      <Sparkles
        className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 text-[var(--color-text-secondary)]"
        strokeWidth={2.25}
        aria-hidden
      />
    </span>
  );
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
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label="Mở trợ lý AI"
      aria-expanded={open}
      onClick={onClick}
      title="Trợ lý AI"
      className={cn(
        "h-10 w-10 px-0",
        open && "bg-[var(--color-surface-muted)]",
        className
      )}
    >
      <AiAssistantIcon />
    </Button>
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
