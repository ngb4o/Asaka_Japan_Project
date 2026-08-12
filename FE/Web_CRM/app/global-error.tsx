"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

/**
 * Root layout failure — must render its own <html>/<body>.
 * Keep styles inline so it works even when theme/CSS providers fail.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "Barlow, system-ui, sans-serif",
          background: "#0a110e",
          color: "#eef5f1",
        }}>
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(244, 63, 94, 0.15)",
              color: "#fda4af",
            }}>
            <TriangleAlert size={28} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "#8fa399",
            }}>
            LỖI HỆ THỐNG
          </p>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
            ASAKA CRM gặp sự cố
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#8fa399" }}>
            {error.message?.trim() ||
              "Ứng dụng không khởi động được. Thử tải lại trang."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 8,
              height: 40,
              padding: "0 20px",
              border: "none",
              borderRadius: 10,
              background: "#3dcc6a",
              color: "#062a12",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}>
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
