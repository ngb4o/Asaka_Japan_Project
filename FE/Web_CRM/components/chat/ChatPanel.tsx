"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImageIcon,
  Loader2,
  Mic,
  Send,
  X,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { PendingActionCard } from "@/components/chat/PendingActionCard";
import { PreviewableImage } from "@/components/ui/previewable-image";
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
import { uploadProductImage } from "@/lib/api/uploads";
import { compressImage } from "@/lib/imageCompression";
import {
  emitCrmDataChanged,
  entitiesForChatTool,
} from "@/lib/hooks/useCrmDataRefresh";
import { renderChatMarkdown } from "@/lib/chatMarkdown";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  canManageLeads,
  canManageProducts,
  canManageSuppliers,
  canManageDealers,
  rolesOf,
} from "@/lib/auth/permissions";

const IMAGE_ACTIONS = [
  {
    id: "product",
    label: "Sản phẩm",
    prompt:
      "Đây là ảnh bao bì sản phẩm. Đọc nhãn rồi đề xuất thêm sản phẩm (chờ xác nhận).",
  },
  {
    id: "dealer",
    label: "Đại lý",
    prompt:
      "Đây là ảnh bảng hiệu đại lý. Đọc tên, SĐT, địa chỉ rồi đề xuất tạo đại lý (chờ xác nhận).",
  },
  {
    id: "lead",
    label: "Khách tiềm năng",
    prompt:
      "Đây là ảnh khách tiềm năng / bảng hiệu. Đọc tên, SĐT rồi đề xuất tạo lead (chờ xác nhận).",
  },
  {
    id: "supplier",
    label: "Nhà cung cấp",
    prompt:
      "Đây là ảnh nhà cung cấp / bảng hiệu NCC. Đọc tên, SĐT, MST rồi đề xuất tạo NCC (chờ xác nhận).",
  },
  {
    id: "read",
    label: "Chỉ đọc chữ",
    prompt:
      "Đọc chữ trên ảnh này. Chỉ tóm tắt nội dung, không tạo sản phẩm, đại lý, lead hay NCC.",
  },
] as const;

const VOICE_HINTS = [
  "Đơn đang giao hôm nay",
  "Chi tiết đơn O-…",
  "Công nợ đại lý …",
  "Tồn kho thấp",
  "Doanh thu tháng … năm …",
  "Giao xong đơn O-…",
  "Thu … đồng đơn O-…",
  "Tạo lead … số điện thoại …",
  "Tạm ứng chuyến CT-…",
];

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

const COMPANY_LOGO = "/images/brand/logo.png";
const MAX_VOICE_MS = 45_000;

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<{
      isFinal: boolean;
      0: { transcript: string };
    }>;
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return (
    speechWindow.SpeechRecognition ||
    speechWindow.webkitSpeechRecognition ||
    null
  );
}

function ChatLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={COMPANY_LOGO} alt="" className={cn("object-contain", className)} />
  );
}

function AssistantAvatar() {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border-subtle)] bg-white">
      <ChatLogo className="h-6 w-6" />
    </span>
  );
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function TypingBubble() {
  return (
    <div className="flex justify-start gap-2">
      <AssistantAvatar />
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

const DEFAULT_SUGGESTIONS = [
  "Đơn còn nợ hôm nay?",
  "Tồn kho sản phẩm nào thấp?",
  "Chụp bao bì để thêm sản phẩm",
];

function HintButtons({
  items,
}: {
  items: Array<{ key: string; label: string; selected?: boolean; onClick: () => void }>;
}) {
  return (
    <div className="mt-5 grid w-full max-w-[340px] grid-cols-2 gap-1.5">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={item.onClick}
          className={cn(
            "rounded-xl border px-2.5 py-2 text-left text-[12px] leading-snug transition-colors",
            item.selected
              ? "border-[var(--color-text-secondary)] bg-[var(--color-text-secondary)] text-white"
              : "border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)]/40 hover:bg-[var(--color-surface-muted)]"
          )}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ChatEmptyState({
  hintItems,
}: {
  hintItems: Array<{ key: string; label: string; selected?: boolean; onClick: () => void }>;
}) {
  return (
    <div className="flex h-full min-h-[280px] w-full flex-1 flex-col items-center justify-center px-4 py-6 text-center">
      <div className="relative mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22%] border border-black/10 bg-white shadow-[var(--shadow-soft)] md:mb-3 md:h-16 md:w-16">
        <ChatLogo className="h-[78%] w-[78%]" />
      </div>

      <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
        Trợ lý AI ASAKA
      </p>

      <HintButtons items={hintItems} />
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
  imageActions,
  voiceState,
  onToggleVoice,
  onPickVoiceHint,
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
  imageActions: Array<(typeof IMAGE_ACTIONS)[number]>;
  voiceState: "idle" | "recording";
  onToggleVoice: () => void;
  onPickVoiceHint: (text: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const showTyping =
    streaming && (!lastAssistant || !lastAssistant.content.trim());

  const hintItems =
    pendingImageUrl && imageActions.length
      ? imageActions.map((action) => ({
          key: action.id,
          label: action.label,
          selected: input.trim() === action.prompt,
          onClick: () =>
            setInput(input.trim() === action.prompt ? "" : action.prompt),
        }))
      : voiceState === "recording"
        ? VOICE_HINTS.map((hint) => ({
            key: hint,
            label: hint,
            selected: input.trim() === hint,
            onClick: () => onPickVoiceHint(hint),
          }))
        : DEFAULT_SUGGESTIONS.map((item) => ({
            key: item,
            label: item,
            onClick: () => setInput(item),
          }));

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
          <ChatEmptyState hintItems={hintItems} />
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
                "flex w-full gap-2",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}>
              {msg.role !== "user" ? <AssistantAvatar /> : null}
              <div
                className={cn(
                  "min-w-0 space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "ml-auto w-fit max-w-[85%] bg-[var(--color-text-secondary)] text-left text-[var(--color-text-tertiary)]"
                    : msg.role === "system"
                      ? "max-w-[92%] border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] text-[var(--color-text-inverse)]"
                      : "max-w-[92%] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
                )}>
                {msg.imageUrl ? (
                  <div
                    className={cn(
                      "relative mb-1 overflow-hidden rounded-xl",
                      msg.role === "user"
                        ? "h-28 w-28 md:h-24 md:w-24"
                        : "h-32 w-full md:h-28"
                    )}>
                    <PreviewableImage
                      src={msg.imageUrl}
                      alt="Ảnh gửi kèm"
                      fill
                      className="rounded-xl border-0"
                    />
                  </div>
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

        {messages.length > 0 &&
        (voiceState === "recording" || pendingImageUrl) ? (
          <div className="flex justify-center px-1 py-2">
            <HintButtons items={hintItems} />
          </div>
        ) : null}

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
              <PreviewableImage
                src={pendingImageUrl}
                alt="Ảnh đính kèm"
                fill
                className="rounded-lg border-0"
              />
              <button
                type="button"
                aria-label="Gỡ ảnh"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onClearImage();
                }}
                className="absolute right-0.5 top-0.5 z-[1] inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white">
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--color-text-inverse)]">
              Chọn loại ảnh ở gợi ý phía trên rồi gửi.
            </p>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 w-10 shrink-0 px-0"
            disabled={streaming || uploadingImage || voiceState !== "idle"}
            aria-label="Đính ảnh"
            onClick={onPickImage}>
            {uploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant={voiceState === "recording" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-10 w-10 shrink-0 px-0",
              voiceState === "recording" && "animate-pulse"
            )}
            disabled={streaming || uploadingImage}
            aria-label={
              voiceState === "recording" ? "Dừng nói" : "Nói thành chữ"
            }
            onClick={onToggleVoice}>
            {voiceState === "recording" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              voiceState === "recording"
                ? "Đang nghe… nói đi, chữ sẽ hiện ở đây"
                : pendingImageUrl
                  ? "Chọn loại ảnh hoặc ghi chú thêm…"
                  : "Nhập hoặc bấm mic để nói…"
            }
            readOnly={voiceState !== "idle"}
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
  const { user } = useAuth();
  const roles = rolesOf(user);
  const imageActions = IMAGE_ACTIONS.filter((action) => {
    if (action.id === "product") return canManageProducts(roles);
    if (action.id === "dealer") return canManageDealers(roles);
    if (action.id === "lead") return canManageLeads(roles);
    if (action.id === "supplier") return canManageSuppliers(roles);
    return true;
  });
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingBusy, setPendingBusy] = useState<string | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "recording">("idle");
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<UiMessage[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const voiceTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recordingRef = useRef(false);
  const liveFinalRef = useRef("");
  const liveInterimRef = useRef("");
  const inputBaseRef = useRef("");
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
    setUploadingImage(true);
    try {
      const result = await uploadProductImage(await compressImage(file));
      setPendingImageUrl(result.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploadingImage(false);
    }
  }

  const send = async (overrideText?: string) => {
    const fromMic = recordingRef.current || voiceState === "recording";
    const voiced = fromMic ? pauseVoice() : "";
    const text = (overrideText ?? (voiced || input)).trim();
    const imageUrl = pendingImageUrl;
    if (streaming || uploadingImage) return;
    if (!text && !imageUrl) return;

    const message =
      text ||
      "Đọc chữ trên ảnh này. Chưa rõ loại thì hỏi tôi muốn tạo sản phẩm, đại lý, lead hay NCC.";
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

  const composeVoiceText = () => {
    const parts = [
      inputBaseRef.current,
      liveFinalRef.current,
      liveInterimRef.current,
    ].filter(Boolean);
    return parts.join(" ").replace(/\s+/g, " ").trim();
  };

  const pauseVoice = () => {
    recordingRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    if (voiceTimerRef.current) {
      window.clearTimeout(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    const text = composeVoiceText();
    liveInterimRef.current = "";
    setInput(text);
    setVoiceState("idle");
    return text;
  };

  const applyLiveTranscript = (finalText: string, interimText: string) => {
    liveInterimRef.current = interimText;
    const parts = [inputBaseRef.current, finalText, interimText].filter(Boolean);
    setInput(parts.join(" ").replace(/\s+/g, " ").trimStart());
  };

  const startLiveSpeech = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;
    const recognition = new Ctor();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;
    liveFinalRef.current = "";
    liveInterimRef.current = "";
    recognition.onresult = (event) => {
      let interim = "";
      let finalText = liveFinalRef.current;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalText = `${finalText} ${piece}`.trim();
        } else {
          interim += piece;
        }
      }
      liveFinalRef.current = finalText;
      applyLiveTranscript(finalText, interim);
    };
    recognition.onend = () => {
      if (!recordingRef.current) return;
      try {
        recognition.start();
      } catch {
        /* already started */
      }
    };
    recognition.onerror = () => {
      /* no-speech */
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch {
      recognitionRef.current = null;
      return false;
    }
  };

  const startVoice = () => {
    if (streaming || uploadingImage || voiceState !== "idle") return;
    inputBaseRef.current = input.trim();
    liveFinalRef.current = "";
    recordingRef.current = true;
    if (!startLiveSpeech()) {
      recordingRef.current = false;
      toast.error("Trình duyệt không hỗ trợ nói thành chữ. Dùng Chrome hoặc gõ tay.");
      return;
    }
    setVoiceState("recording");
    voiceTimerRef.current = window.setTimeout(() => {
      pauseVoice();
    }, MAX_VOICE_MS);
  };

  const toggleVoice = () => {
    if (streaming) return;
    if (voiceState === "recording") {
      pauseVoice();
      return;
    }
    startVoice();
  };

  useEffect(() => {
    return () => {
      recordingRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      if (voiceTimerRef.current) window.clearTimeout(voiceTimerRef.current);
    };
  }, []);

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
      onClearImage={() => {
        setPendingImageUrl(null);
        setInput((current) =>
          IMAGE_ACTIONS.some((action) => action.prompt === current.trim())
            ? ""
            : current
        );
      }}
      imageActions={imageActions}
      voiceState={voiceState}
      onToggleVoice={toggleVoice}
      onPickVoiceHint={(text) => {
        inputBaseRef.current = text;
        liveFinalRef.current = "";
        liveInterimRef.current = "";
        setInput(text);
      }}
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
