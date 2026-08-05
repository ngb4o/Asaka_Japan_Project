import { getStoredToken } from "@/lib/auth/session";
import { ApiClientError, apiRequest } from "@/lib/api/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8017/api";

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PendingConfirmation = {
  token: string;
  toolName: string;
  preview: string;
  expiresAt: number;
};

export type ChatStreamHandlers = {
  onStatus?: (data: {
    phase: string;
    round?: number;
    from?: string;
    to?: string;
    message?: string;
  }) => void;
  onToken?: (text: string) => void;
  onToolStart?: (data: { name: string; id?: string }) => void;
  onToolResult?: (data: {
    name: string;
    ok: boolean;
    pending?: boolean;
    preview?: string;
    error?: string | null;
  }) => void;
  onPending?: (data: PendingConfirmation) => void;
  onDone?: (data: {
    content: string;
    pending: PendingConfirmation | null;
    contextDigest?: string | null;
  }) => void;
  onError?: (message: string) => void;
};

function parseSseChunk(buffer: string) {
  const events: Array<{ event: string; data: string }> = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() || "";
  for (const part of parts) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) {
      events.push({ event, data: dataLines.join("\n") });
    }
  }
  return { events, rest };
}

export async function streamChatMessage(
  payload: { messages: ChatHistoryMessage[]; message: string },
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
) {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/chat/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const payloadJson = await response.json().catch(() => ({}));
    throw new ApiClientError(
      payloadJson.message || "Không gửi được tin nhắn chat",
      payloadJson.statusCode || response.status
    );
  }

  if (!response.body) {
    throw new ApiClientError("Không nhận được stream phản hồi", 500);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseChunk(buffer);
    buffer = parsed.rest;

    for (const item of parsed.events) {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(item.data);
      } catch {
        continue;
      }

      switch (item.event) {
        case "status":
          handlers.onStatus?.(
            data as {
              phase: string;
              round?: number;
              from?: string;
              to?: string;
              message?: string;
            }
          );
          break;
        case "token":
          if (typeof data.text === "string") handlers.onToken?.(data.text);
          break;
        case "tool_start":
          handlers.onToolStart?.(data as { name: string; id?: string });
          break;
        case "tool_result":
          handlers.onToolResult?.(
            data as {
              name: string;
              ok: boolean;
              pending?: boolean;
              preview?: string;
              error?: string | null;
            }
          );
          break;
        case "pending_confirmation":
          handlers.onPending?.(data as PendingConfirmation);
          break;
        case "done":
          handlers.onDone?.(
            data as {
              content: string;
              pending: PendingConfirmation | null;
              contextDigest?: string | null;
            }
          );
          break;
        case "error":
          handlers.onError?.(
            typeof data.message === "string"
              ? data.message
              : "Lỗi chatbot"
          );
          break;
        default:
          break;
      }
    }
  }
}

export async function confirmChatAction(token: string, accept: boolean) {
  return apiRequest<{
    cancelled: boolean;
    toolName?: string;
    preview?: string;
    message: string;
    data?: unknown;
  }>("/chat/confirm", {
    method: "POST",
    body: { token, accept },
  });
}

export async function cancelChatAction(token: string) {
  return apiRequest<{ cancelled: boolean; message: string }>("/chat/cancel", {
    method: "POST",
    body: { token },
  });
}
