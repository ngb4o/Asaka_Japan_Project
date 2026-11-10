"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { login } from "@/lib/api";
import { setToken } from "@/lib/session";
import type { AuthUser } from "@/lib/types";

export function LoginScreen({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await login(username.trim(), password);
      setToken(result.token);
      onSuccess(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden p-4">
      <img
        src="/images/backgrounds/hero.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-[#013a02]/55 to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(1,125,3,0.25),transparent_55%)]" />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-[20px] border border-white/20 bg-[var(--color-surface-elevated)]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <h1 className="text-xl font-semibold">Kho hàng</h1>
        <p className="mt-1 text-sm text-[var(--color-text-inverse)]">Đăng nhập để xem và xuất nhập kho.</p>
        <label className="mt-5 block space-y-2 text-sm font-medium">
          <span>Tên đăng nhập</span>
          <input
            value={username}
            autoComplete="username"
            autoFocus
            onChange={(event) => setUsername(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="mt-4 block space-y-2 text-sm font-medium">
          <span>Mật khẩu</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={submitting} className={`${primaryButton} mt-5 w-full`}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Đăng nhập
        </button>
      </form>
    </div>
  );
}

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-sm font-normal shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016502] disabled:opacity-50";
