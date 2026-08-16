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
import { NotificationProvider } from "@/lib/notifications/NotificationProvider";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canAccessPath, rolesOf } from "@/lib/auth/permissions";
import { rememberReturnTo } from "@/lib/pwa/return-to";

function WorkspaceLoading() {
  return (
    <div
      className="crm-ios-fill relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6"
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

      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-10">
        <div className="relative flex size-[22vmin] min-h-20 min-w-20 max-h-28 max-w-28 items-center justify-center overflow-hidden rounded-[22%] border border-black/10 bg-white shadow-[var(--shadow-elevated)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/brand/logo.png"
            alt=""
            className="size-[78%] object-contain"
          />
        </div>

        <div
          className="h-1 w-[22vmin] min-w-20 max-w-28 overflow-hidden rounded-full bg-white/20 sm:h-1.5"
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
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) {
      rememberReturnTo(`${pathname}${window.location.search}`);
      router.replace("/login");
    }
  }, [mounted, loading, user, router, pathname]);

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
                  data-crm-scroll-root=""
                  className={
                    paddedMobile
                      ? "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(3rem+env(safe-area-inset-bottom,0px))] lg:pb-0 [scrollbar-gutter:stable]"
                      : "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[var(--color-surface-elevated)] pb-[calc(3rem+env(safe-area-inset-bottom,0px))] lg:bg-transparent lg:pb-0 [scrollbar-gutter:stable]"
                  }>
                  <div
                    key={pathname}
                    className={
                      paddedMobile
                        ? "crm-page-enter crm-page-padded w-full max-w-[1600px] space-y-2 p-2.5 sm:space-y-3 sm:p-3 md:space-y-3 md:p-4 lg:p-4"
                        : "crm-page-enter crm-page-flush min-h-full w-full max-w-[1600px] space-y-0 p-0 lg:min-h-0 lg:space-y-3 lg:p-4"
                    }>
                    {children}
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
