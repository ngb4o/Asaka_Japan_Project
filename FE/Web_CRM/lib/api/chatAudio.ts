import { getStoredToken } from "@/lib/auth/session";
import { ApiClientError } from "@/lib/api/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8017/api";

export async function transcribeChatAudio(
  file: Blob,
  filename = "voice.webm"
) {
  const formData = new FormData();
  formData.append("audio", file, filename);
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/chat/transcribe`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiClientError(
      payload.message || "Không nhận được chữ từ giọng nói",
      payload.statusCode || response.status
    );
  }
  const text = String(
    (payload as { data?: { text?: string } }).data?.text || ""
  ).trim();
  if (!text) {
    throw new ApiClientError("Không nghe rõ. Nói lại gần mic hơn.", 422);
  }
  return text;
}
