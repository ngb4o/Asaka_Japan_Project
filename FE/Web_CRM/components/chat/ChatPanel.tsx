"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImageIcon,
  Loader2,
  Send,
  Sparkles,
  X,
} from "@/components/ui/icons";
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
import { getImageUrl, uploadProductImage } from "@/lib/api/uploads";
import {
  emitCrmDataChanged,
  entitiesForChatTool,
} from "@/lib/hooks/useCrmDataRefresh";
import { renderChatMarkdown } from "@/lib/chatMarkdown";
import { cn } from "@/lib/utils";

type UiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  imageUrl?: string | null;
  pending?: PendingConfirmation | null;
  toolHint?: string | null;
  /** IDs/mã từ tool — chỉ gửi lại API, không hiện UI */
  contextDigest?: string | null;
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
        aria-label="Đang trả lời">
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
    "Chụp bao bì để thêm sản phẩm",
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
        Hỏi đơn hàng, tồn kho… hoặc chụp bao bì để AI đề xuất thêm sản phẩm —
        thao tác ghi cần bạn xác nhận.
      </p>

      <div className="mt-5 flex w-full max-w-[300px] flex-col gap-2">
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSuggest(item)}
            className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3.5 py-2.5 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-secondary)]/40 hover:bg-[var(--color-surface-muted)]">
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
  pendingImageUrl,
  uploadingImage,
  onPickImage,
  onClearImage,
}: {
  messages: UiMessage[];
  streaming: boolean;
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onConfirmPending: (token: string) => void;
  onCancelPending: (token: string) => void;
  pendingBusy: string | null;
  pendingImageUrl: string | null;
  uploadingImage: boolean;
  onPickImage: () => void;
  onClearImage: () => void;
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
        )}>
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
              )}>
              <div
                className={cn(
                  "max-w-[92%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-[var(--color-text-secondary)] text-[var(--color-text-tertiary)]"
                    : msg.role === "system"
                      ? "border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] text-[var(--color-text-inverse)]"
                      : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
                )}>
                {msg.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getImageUrl(msg.imageUrl)}
                    alt="Ảnh gửi kèm"
                    className="mb-2 max-h-40 w-full rounded-xl object-cover"
                  />
                ) : null}
                {msg.content ? (
                  <div className="crm-chat-markdown space-y-2">
                    {renderChatMarkdown(msg.content)}
                  </div>
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
        }}>
        {pendingImageUrl ? (
          <div className="mb-2 flex items-center gap-2">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border-subtle)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageUrl(pendingImageUrl)}
                alt="Ảnh đính kèm"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                aria-label="Gỡ ảnh"
                onClick={onClearImage}
                className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white">
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-inverse)]">
              AI sẽ đọc nhãn bao bì và đề xuất thêm sản phẩm.
            </p>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 w-10 shrink-0 px-0"
            disabled={streaming || uploadingImage}
            aria-label="Đính ảnh bao bì"
            onClick={onPickImage}>
            {uploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              pendingImageUrl ? "Ghi chú thêm (không bắt buộc)…" : "Nhập câu hỏi…"
            }
            disabled={streaming}
            className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-text-secondary)]"
          />
          <Button
            type="submit"
            size="sm"
            className="h-10 w-10 shrink-0 px-0"
            disabled={
              streaming ||
              uploadingImage ||
              (!input.trim() && !pendingImageUrl)
            }
            aria-label="Gửi">
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
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<UiMessage[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  messagesRef.current = messages;

  const historyForApi = (): ChatHistoryMessage[] =>
    messagesRef.current
      .filter(
        (m) =>
          m.role === "user" || m.role === "assistant" || m.role === "system"
      )
      .filter((m) => m.content.trim() || m.contextDigest?.trim())
      .map((m) => {
        const digest = m.contextDigest?.trim();
        const body = m.content.trim();
        const content =
          digest && m.role !== "user"
            ? body
              ? `${body}\n\n${digest}`
              : digest
            : body;
        return {
          // system = kết quả Xác nhận/Hủy — gửi như assistant để model biết đã xong
          role: (m.role === "user" ? "user" : "assistant") as
            | "user"
            | "assistant",
          content,
        };
      });

  async function handleImageFile(file: File | undefined) {
    if (!file || streaming) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.warning("Ảnh tối đa 20MB");
      return;
    }
    setUploadingImage(true);
    try {
      const result = await uploadProductImage(file);
      setPendingImageUrl(result.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploadingImage(false);
    }
  }

  const send = async () => {
    const text = input.trim();
    const imageUrl = pendingImageUrl;
    if (streaming || uploadingImage) return;
    if (!text && !imageUrl) return;

    const message =
      text ||
      "Thêm sản phẩm từ ảnh bao bì này. Đọc nhãn rồi đề xuất tạo sản phẩm.";
    const priorHistory = historyForApi();

    setInput("");
    setPendingImageUrl(null);
    const userMsg: UiMessage = {
      id: uid(),
      role: "user",
      content: message,
      imageUrl,
    };
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
        {
          messages: priorHistory,
          message,
          ...(imageUrl ? { imageUrl } : {}),
        },
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
                      contextDigest: data.contextDigest || null,
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

  function pickFromCamera() {
    setSourcePickerOpen(false);
    window.setTimeout(() => cameraInputRef.current?.click(), 180);
  }

  function pickFromGallery() {
    setSourcePickerOpen(false);
    window.setTimeout(() => galleryInputRef.current?.click(), 180);
  }

  const fileInputs = (
    <>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void handleImageFile(file);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void handleImageFile(file);
        }}
      />
    </>
  );

  const pickerSheet = (
    <BottomSheet
      open={sourcePickerOpen}
      onOpenChange={setSourcePickerOpen}
      title="Thêm ảnh">
      <div className="-mx-1 divide-y divide-[var(--color-border-subtle)]">
        <button
          type="button"
          className="flex h-12 w-full items-center gap-3 px-3 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
          onClick={pickFromCamera}>
          <Camera className="h-5 w-5 shrink-0 text-[var(--color-text-inverse)]" />
          Chụp ảnh
        </button>
        <button
          type="button"
          className="flex h-12 w-full items-center gap-3 px-3 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
          onClick={pickFromGallery}>
          <ImageIcon className="h-5 w-5 shrink-0 text-[var(--color-text-inverse)]" />
          Chọn từ thư viện
        </button>
      </div>
    </BottomSheet>
  );

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
      pendingImageUrl={pendingImageUrl}
      uploadingImage={uploadingImage}
      onPickImage={() => {
        if (isMobile) {
          setSourcePickerOpen(true);
          return;
        }
        galleryInputRef.current?.click();
      }}
      onClearImage={() => setPendingImageUrl(null)}
    />
  );

  if (isMobile) {
    return (
      <>
        <BottomSheet
          open={open}
          onOpenChange={onOpenChange}
          title="Trợ lý AI"
          maxHeight="88dvh">
          <div className="flex h-[min(70dvh,560px)] flex-col">{body}</div>
        </BottomSheet>
        {fileInputs}
        {pickerSheet}
      </>
    );
  }

  if (!open) return null;

  return (
    <>
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        {body}
      </div>
      {fileInputs}
      {pickerSheet}
    </>
  );
}
