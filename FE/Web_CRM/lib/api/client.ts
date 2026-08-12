import type { ApiResponse } from "@/lib/types";
import { getStoredToken } from "@/lib/auth/session";
import {
  emitOfflineCacheHit,
  readApiCache,
  shouldCacheGet,
  writeApiCache,
} from "@/lib/offline/api-cache";
import {
  canQueueMutation,
  enqueueMutation,
} from "@/lib/offline/mutation-queue";
import { requestBackgroundSync } from "@/lib/offline/sync";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8017/api";

export class ApiClientError extends Error {
  statusCode: number;
  /** Mutation was saved locally and will sync when online */
  queued?: boolean;
  /** Response served from IndexedDB cache */
  fromCache?: boolean;

  constructor(
    message: string,
    statusCode: number,
    meta?: { queued?: boolean; fromCache?: boolean }
  ) {
    super(message);
    this.statusCode = statusCode;
    this.queued = meta?.queued;
    this.fromCache = meta?.fromCache;
  }

  /** Fetch failed / offline / unreachable API */
  get isNetworkError() {
    return this.statusCode === 0;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  /** Skip reading/writing offline GET cache */
  skipCache?: boolean;
};

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, auth = true, skipCache = false }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const isGet = method === "GET";

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (isGet && !skipCache && shouldCacheGet(path)) {
      const cached = await readApiCache(path);
      if (cached) {
        emitOfflineCacheHit(cached.savedAt);
        return cached.data as T;
      }
    }

    if (!isGet && canQueueMutation(path, body)) {
      await enqueueMutation({
        path,
        method: method as "POST" | "PUT" | "DELETE",
        body,
        auth,
      });
      void requestBackgroundSync();
      throw new ApiClientError(
        "Không gửi được — thao tác đã xếp hàng, sẽ đồng bộ khi có mạng.",
        0,
        { queued: true }
      );
    }

    throw new ApiClientError(
      "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
      0
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiClientError(
      payload.message || "Request failed",
      payload.statusCode || response.status
    );
  }

  const data = (payload as ApiResponse<T>).data;

  if (isGet && !skipCache && shouldCacheGet(path)) {
    void writeApiCache(path, data);
  }

  return data;
}
