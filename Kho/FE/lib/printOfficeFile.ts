import { clearToken, getToken } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8018";

export async function printOfficeBlob(file: Blob, filename: string) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  const token = getToken();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}/api/v1/office-pdf`, {
    method: "POST",
    headers,
    body: JSON.stringify({ filename, contentBase64: btoa(binary) }),
    cache: "no-store",
  });
  if (response.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event("kho-unauthorized"));
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Không in được file mẫu");
  }
  const pdf = await response.blob();
  await openPdfPrint(pdf);
}

function openPdfPrint(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "In phiếu");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = url;
  const cleanup = () => {
    iframe.remove();
    URL.revokeObjectURL(url);
  };
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(cleanup, 60_000);
  };
  document.body.appendChild(iframe);
}
