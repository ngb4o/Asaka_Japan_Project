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
    <div className="relative flex min-h-screen overflow-hidden">
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

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle className="border-white/25 bg-black/35 text-white hover:bg-black/50 hover:text-white" />
      </div>

      <div className="relative z-10 flex w-full flex-col lg:flex-row">
        <aside className="flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div className="auth-fade-in flex items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]">
              <Image
                src="/images/brand/logo.png"
                alt="ASAKA JAPAN"
                width={96}
                height={96}
                quality={100}
                className="h-full w-full object-contain"
              />
            </span>
            <div>
              <p className="text-base font-semibold text-white">ASAKA CRM</p>
              <p className="text-xs text-white/70">ASAKA JAPAN</p>
            </div>
          </div>

          <div className="auth-fade-in-up mt-10 max-w-lg lg:mt-0">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7dcf7f]">
              Quản trị nội bộ
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
              Hệ thống quản lý sản phẩm & kho hàng
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/75 sm:text-base">
              Đồng bộ danh mục, tồn kho và tin tức trên một nền tảng — phục vụ vận hành
              ASAKA JAPAN nhanh chóng, chính xác.
            </p>
          </div>

          <p className="auth-fade-in mt-10 hidden text-xs text-white/45 lg:block">
            © {new Date().getFullYear()} Công ty TNHH ASAKA - JAPAN
          </p>
        </aside>

        <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:px-8 lg:px-12 lg:py-12">
          <div className="auth-fade-in-up auth-delay w-full max-w-[420px] rounded-[20px] border border-white/20 bg-[var(--color-surface-elevated)]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-[var(--color-text-inverse)]">{subtitle}</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
