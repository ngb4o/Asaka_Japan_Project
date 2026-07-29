"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden">
      <Image
        src="/images/backgrounds/hero.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-[#013a02]/55 to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(1,125,3,0.25),transparent_55%)]" />

      <div className="relative z-10 flex min-h-[100dvh] w-full flex-col overflow-y-auto lg:min-h-screen lg:overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 lg:px-14 lg:pt-12">
          <div className="auth-fade-in flex min-w-0 items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.2)] sm:h-12 sm:w-12">
              <Image
                src="/images/brand/logo.png"
                alt="ASAKA JAPAN"
                width={96}
                height={96}
                quality={100}
                className="h-full w-full object-contain"
              />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-white">ASAKA CRM</p>
              <p className="text-xs text-white/70">ASAKA JAPAN</p>
            </div>
          </div>
          <ThemeToggle className="shrink-0 border-white/25 bg-black/35 text-white hover:bg-black/50 hover:text-white" />
        </header>

        <div className="flex flex-1 flex-col justify-center gap-5 py-4 sm:gap-6 lg:flex-row lg:items-stretch lg:justify-start lg:gap-0 lg:py-0">
        <aside className="flex shrink-0 flex-col gap-3 px-5 sm:gap-4 sm:px-8 lg:flex-1 lg:justify-between lg:gap-0 lg:px-14 lg:pb-12 lg:pt-6">
          <div className="auth-fade-in-up max-w-lg lg:mt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7dcf7f] sm:text-sm sm:tracking-[0.2em]">
              Quản trị nội bộ
            </p>
            <h1 className="mt-2 text-xl font-semibold leading-snug text-white sm:mt-3 sm:text-3xl sm:leading-tight lg:text-5xl">
              Hệ thống quản lý sản phẩm & kho hàng
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-white/75 sm:mt-4 sm:text-sm lg:text-base">
              Đồng bộ danh mục, tồn kho và tin tức trên một nền tảng — phục vụ vận hành
              ASAKA JAPAN nhanh chóng, chính xác.
            </p>
          </div>

          <p className="auth-fade-in hidden text-xs text-white/45 lg:block">
            © {new Date().getFullYear()} Công ty TNHH ASAKA - JAPAN
          </p>
        </aside>

        <main
          className="flex shrink-0 items-center justify-center px-4 sm:px-8 lg:min-h-0 lg:flex-1 lg:px-12 lg:py-12"
          style={{
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="auth-fade-in-up auth-delay w-full max-w-[420px] rounded-[20px] border border-white/20 bg-[var(--color-surface-elevated)]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--color-text-inverse)]">
                {subtitle}
              </p>
            </div>
            {children}
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
