"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { PendingActionCard } from "@/components/chat/PendingActionCard";
import { useToast } from "@/components/providers/ToastProvider";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  cancelChatAction,
  confirmChatAction,
  streamChatMessage,
  type ChatHistoryMessage,
  type PendingConfirmation,
} from "@/lib/api/chat";
import { ApiClientError } from "@/lib/api/client";
import {
  emitCrmDataChanged,
  entitiesForChatTool,
} from "@/lib/hooks/useCrmDataRefresh";
import { cn } from "@/lib/utils";

type UiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pending?: PendingConfirmation | null;
  toolHint?: string | null;
};

type ChatPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div
        className="max-w-[92%] rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3.5 py-3 text-[var(--color-text-primary)] shadow-sm"
        aria-live="polite"
        aria-label="Đang trả lời"
      >
        <div className="flex h-5 items-center gap-1.5 px-0.5">
          <span className="crm-chat-typing-dot h-2 w-2 rounded-full bg-[var(--color-text-inverse)]" />
          <span className="crm-chat-typing-dot h-2 w-2 rounded-full bg-[var(--color-text-inverse)]" />
          <span className="crm-chat-typing-dot h-2 w-2 rounded-full bg-[var(--color-text-inverse)]" />
        </div>
      </div>
    </div>
  );
}

function ChatEmptyState({ onSuggest }: { onSuggest: (text: string) => void }) {
  const suggestions = [
    "Đơn còn nợ hôm nay?",
    "Tồn kho sản phẩm nào thấp?",
    "Chuyến đang đi có những gì?",
  ];

  return (
    <div className="flex h-full min-h-[280px] w-full flex-1 flex-col items-center justify-center px-4 py-6 text-center">
      <div className="relative mb-5">
        <div
          className="absolute -inset-3 rounded-full bg-[var(--color-text-secondary)]/10 blur-md"
          aria-hidden
        />
        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[var(--color-text-secondary)]/25 bg-gradient-to-br from-[var(--color-text-secondary)] to-[#014a02] shadow-lg shadow-[var(--color-text-secondary)]/25">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/brand/logo.png"
            alt=""
            className="h-11 w-11 object-contain brightness-0 invert"
          />
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-surface-elevated)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>

      <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
        Trợ lý AI ASAKA
      </p>
      <p className="mt-1.5 max-w-[260px] text-sm leading-relaxed text-[var(--color-text-inverse)]">
        Hỏi đơn hàng, đại lý, tồn kho, công nợ… hoặc nhờ thao tác — thao tác ghi
        sẽ cần bạn xác nhận.
      </p>

      <div className="mt-5 flex w-full max-w-[300px] flex-col gap-2">
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSuggest(item)}
            className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3.5 py-2.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-secondary)]/40 hover:bg-[var(--color-surface-muted)]"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBody({
  messages,
  streaming,
  input,
  setInput,
  onSend,
  onConfirmPending,
  onCancelPending,
  pendingBusy,
}: {
  messages: UiMessage[];
  streaming: boolean;
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onConfirmPending: (token: string) => void;
  onCancelPending: (token: string) => void;
  pendingBusy: string | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const showTyping =
    streaming && (!lastAssistant || !lastAssistant.content.trim());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, showTyping]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3",
          messages.length === 0 ? "flex" : "space-y-3"
        )}
      >
        {messages.length === 0 ? (
          <ChatEmptyState
            onSuggest={(text) => {
              setInput(text);
            }}
          />
        ) : null}

        {messages.map((msg) => {
          const isEmptyAssistant =
            msg.role === "assistant" && !msg.content.trim() && !msg.pending;
          if (isEmptyAssistant && streaming) {
            return null;
          }

          return (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[92%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-[var(--color-text-secondary)] text-[var(--color-text-tertiary)]"
                    : msg.role === "system"
                      ? "border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] text-[var(--color-text-inverse)]"
                      : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
                )}
              >
                {msg.content ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : null}
                {msg.pending ? (
                  <PendingActionCard
                    pending={msg.pending}
                    busy={pendingBusy === msg.pending.token}
                    onConfirm={() => onConfirmPending(msg.pending!.token)}
                    onCancel={() => onCancelPending(msg.pending!.token)}
                  />
                ) : null}
              </div>
            </div>
          );
        })}

        {showTyping ? <TypingBubble /> : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="shrink-0 border-t border-[var(--color-border-subtle)] p-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Nhập câu hỏi…"
            disabled={streaming}
            className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-text-secondary)]"
          />
          <Button
            type="submit"
            size="sm"
            className="h-10 w-10 shrink-0 px-0"
            disabled={streaming || !input.trim()}
            aria-label="Gửi"
          >
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ChatPanel({ open, onOpenChange }: ChatPanelProps) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingBusy, setPendingBusy] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const historyForApi = (): ChatHistoryMessage[] =>
    messages
      .filter(
        (m) =>
          m.role === "user" || m.role === "assistant" || m.role === "system"
      )
      .filter((m) => m.content.trim())
      .map((m) => ({
        // system = kết quả Xác nhận/Hủy — gửi như assistant để model biết đã xong
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      }));

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    const userMsg: UiMessage = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", pending: null },
    ]);
    setStreaming(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let assembled = "";
    let pending: PendingConfirmation | null = null;

    try {
      await streamChatMessage(
        { messages: historyForApi(), message: text },
        {
          onToken: (chunk) => {
            assembled += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: assembled } : m
              )
            );
          },
          onPending: (data) => {
            pending = data;
          },
          onDone: (data) => {
            const content = data.content || assembled;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content:
                        content ||
                        (data.pending
                          ? "Đã chuẩn bị thao tác — vui lòng xác nhận bên dưới."
                          : "…"),
                      pending: data.pending || pending,
                    }
                  : m
              )
            );
          },
          onError: (message) => {
            toast.error(message);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content || `Lỗi: ${message}` }
                  : m
              )
            );
          },
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Không kết nối được chatbot";
      toast.error(message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: m.content || message }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  };

  const clearPendingOnMessage = (token: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.pending?.token === token ? { ...m, pending: null } : m
      )
    );
  };

  const onConfirmPending = async (token: string) => {
    setPendingBusy(token);
    try {
      const result = await confirmChatAction(token, true);
      clearPendingOnMessage(token);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "system",
          content: result.message || "Đã thực hiện thao tác.",
        },
      ]);
      toast.success(result.message || "Đã xác nhận");
      emitCrmDataChanged(entitiesForChatTool(result.toolName), {
        toolName: result.toolName,
      });
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Không xác nhận được thao tác"
      );
    } finally {
      setPendingBusy(null);
    }
  };

  const onCancelPending = async (token: string) => {
    setPendingBusy(token);
    try {
      await cancelChatAction(token);
      clearPendingOnMessage(token);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "system",
          content: "Đã hủy thao tác.",
        },
      ]);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không hủy được thao tác"
      );
    } finally {
      setPendingBusy(null);
    }
  };

  const body = (
    <ChatBody
      messages={messages}
      streaming={streaming}
      input={input}
      setInput={setInput}
      onSend={() => void send()}
      onConfirmPending={(token) => void onConfirmPending(token)}
      onCancelPending={(token) => void onCancelPending(token)}
      pendingBusy={pendingBusy}
    />
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Trợ lý AI"
        maxHeight="88dvh"
      >
        <div className="flex h-[min(70dvh,560px)] flex-col">{body}</div>
      </BottomSheet>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 flex h-[min(70vh,640px)] w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Trợ lý AI
          </p>
        </div>
        <button
          type="button"
          aria-label="Đóng"
          onClick={() => onOpenChange(false)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {body}
    </div>
  );
}
