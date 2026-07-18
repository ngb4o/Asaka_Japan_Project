"use client";

import { useEffect, useState } from "react";
import { SocialIconLinks } from "@/components/layout/SocialIconLinks";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD = 160;

export function SocialFab() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-5 right-4 z-50 transition-all duration-[400ms] md:bottom-8 md:right-6",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden={!visible}
    >
      <SocialIconLinks size="md" className="flex-col gap-4" />
    </div>
  );
}
