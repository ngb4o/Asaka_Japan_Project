const FALLBACK_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8017/api";

function isLocalOrLanHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local") ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

/**
 * Trên máy/LAN: luôn gọi API cùng host đang mở CRM (localhost hoặc IP Wi‑Fi hiện tại).
 * Tránh cứng IP trong .env — đổi mạng là IP cũ chết.
 */
export function getApiUrl() {
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (isLocalOrLanHost(hostname)) {
      const apiProtocol = protocol === "https:" ? "https:" : "http:";
      return `${apiProtocol}//${hostname}:8017/api`;
    }
  }
  return FALLBACK_API_URL;
}

export function getApiBaseUrl() {
  return getApiUrl().replace(/\/api\/?$/, "");
}
