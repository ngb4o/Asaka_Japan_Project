import type { ApiResponse } from "@/lib/types";
import { getStoredToken } from "@/lib/auth/session";
import { getApiBaseUrl, getApiUrl } from "@/lib/api/baseUrl";

export { getApiBaseUrl };

export function getImageUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export type UploadResult = {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
};

export async function uploadProductImage(file: File): Promise<UploadResult> {
  return uploadImage(file, "/uploads/product-image");
}

export async function uploadNewsImage(file: File): Promise<UploadResult> {
  return uploadImage(file, "/uploads/news-image");
}

export async function uploadTripReceipt(file: File): Promise<UploadResult> {
  return uploadImage(file, "/uploads/trip-receipt");
}

export async function uploadOrderPhoto(file: File): Promise<UploadResult> {
  return uploadImage(file, "/uploads/order-photo");
}

async function uploadImage(file: File, endpoint: string): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("image", file);

  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Upload failed");
  }

  return (payload as ApiResponse<UploadResult>).data;
}
