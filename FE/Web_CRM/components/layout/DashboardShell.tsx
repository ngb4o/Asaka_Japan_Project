"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import {
  MobileChromeProvider,
} from "@/components/layout/MobileChromeProvider";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { PageEnter } from "@/components/ui/page-enter";
import { NotificationProvider } from "@/lib/notifications/NotificationProvider";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccessPath, rolesOf } from "@/lib/auth/permissions";
import { isIosPwa } from "@/lib/device";

function WorkspaceLoading() {
  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6"
      aria-busy="true"
      aria-label="Đang tải workspace">
      {/* Same hero as login AuthShell */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/backgrounds/hero.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-[#013a02]/55 to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(1,125,3,0.25),transparent_55%)]" />

      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="relative">
          <div className="absolute -inset-3 animate-pulse rounded-2xl bg-white/10" />
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white/95 shadow-[var(--shadow-elevated)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/brand/logo.png"
              alt=""
              className="h-10 w-10 object-contain"
            />
          </div>
        </div>

        <p className="text-base font-semibold tracking-tight text-white">
          ASAKA CRM
        </p>

        <div
          className="h-1.5 w-36 overflow-hidden rounded-full bg-white/20"
          aria-hidden>
          <div className="crm-workspace-loader h-full w-1/2 rounded-full bg-white/90" />
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  /** Avoid SSR/client auth tree mismatch during hydration */
  const [mounted, setMounted] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      root.classList.toggle("crm-ios-pwa", isIosPwa());
    };
    sync();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", sync);
    return () => {
      mq.removeEventListener?.("change", sync);
      root.classList.remove("crm-ios-pwa");
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) router.replace("/login");
  }, [mounted, loading, user, router]);

  useEffect(() => {
    if (!mounted || !user || loading) return;
    if (!canAccessPath(rolesOf(user), pathname)) {
      router.replace("/dashboard");
    }
  }, [mounted, loading, pathname, router, user]);

  if (!mounted || loading) {
    return <WorkspaceLoading />;
  }

  if (!user) return <WorkspaceLoading />;

  const paddedMobile =
    pathname === "/dashboard" ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/receivables") ||
    pathname.startsWith("/settings");

  return (
    <ConfirmProvider>
      <NotificationProvider>
        <MobileChromeProvider scrollRef={mainRef}>
          <ChatWidget>
            <div className="crm-app-shell">
              <Sidebar
                mobileOpen={mobileMenuOpen}
                onMobileOpenChange={setMobileMenuOpen}
              />
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                <DashboardHeader onOpenMenu={() => setMobileMenuOpen(true)} />
                <main
                  ref={mainRef}
                  className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(3rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
                  <div
                    className={
                      paddedMobile
                        ? "crm-page-padded w-full max-w-[1600px] space-y-3 p-3 sm:space-y-4 sm:p-4 md:space-y-5 md:p-5 lg:p-6"
                        : "crm-page-flush w-full max-w-[1600px] space-y-0 p-0 md:space-y-5 md:p-5 lg:p-6"
                    }>
                    <PageEnter>{children}</PageEnter>
                  </div>
                </main>
                <MobileBottomNav onOpenMenu={() => setMobileMenuOpen(true)} />
              </div>
            </div>
          </ChatWidget>
        </MobileChromeProvider>
      </NotificationProvider>
    </ConfirmProvider>
  );
}
