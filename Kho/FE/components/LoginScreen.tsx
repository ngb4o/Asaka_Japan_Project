"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { login } from "@/lib/api";
import { setToken } from "@/lib/session";
import type { AuthUser } from "@/lib/types";

export function LoginScreen({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex h-full min-h-0 flex-col bg-white lg:flex-row">
      <section className="relative h-48 shrink-0 sm:h-60 lg:h-full lg:w-[56%]">
        <img
          src="/images/backgrounds/white-truck.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071827]/80 via-[#071827]/15 to-[#071827]/10" />
        <div className="absolute right-5 bottom-5 left-5 text-white lg:right-12 lg:bottom-12 lg:left-12">
          <p className="text-xs font-semibold tracking-[0.18em] text-white/75 uppercase">Kho hàng</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-5xl">Mai Linh Đông Đô</h1>
          <p className="mt-2 hidden max-w-md text-sm leading-relaxed text-white/80 lg:block">
            Theo dõi tồn kho, lốp, dầu và phiếu ngay trên một màn hình.
          </p>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-5 py-8 sm:px-8 lg:items-center">
        <form onSubmit={handleSubmit} className="ui-pop w-full max-w-[380px]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-white p-1.5 shadow-sm">
              <img src="/icons/icon-192.png" alt="" className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-lg font-semibold">Đăng nhập</p>
              <p className="text-sm text-[var(--color-text-inverse)]">Mai Linh Đông Đô</p>
            </div>
          </div>

          <label className="mt-8 block">
            <span className="text-sm font-medium">Tên đăng nhập</span>
            <input
              value={username}
              autoComplete="username"
              autoFocus
              onChange={(event) => setUsername(event.target.value)}
              className={`${fieldClass} mt-2`}
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-medium">Mật khẩu</span>
            <span className="relative mt-2 block">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                className={`${fieldClass} pr-11`}
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute top-1/2 right-1.5 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          {error ? (
            <p className="mt-4 rounded-[var(--radius-button)] bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <button type="submit" disabled={submitting} className={`${primaryButton} mt-6 w-full`}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Đăng nhập
          </button>
        </form>
      </section>
    </div>
  );
}

const fieldClass =
  "flex h-11 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-3 text-sm font-normal outline-none focus:border-[var(--color-text-secondary)] focus:bg-white focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-hover)] disabled:opacity-50";
