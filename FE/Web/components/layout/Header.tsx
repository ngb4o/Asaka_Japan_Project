"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NAV_LINKS, COMPANY } from "@/lib/constants";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { DealerRegisterButton } from "@/components/dealer/DealerRegisterButton";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function resolveNavHref(href: string) {
  return href.startsWith("#") ? `/${href}` : href;
}

export function Header() {
  const pathname = usePathname();
  const isSolidHeaderPage =
    pathname.startsWith("/products") || pathname.startsWith("/news/");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const useSolidStyle = scrolled || isSolidHeaderPage;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 bg-transparent transition-all duration-[400ms]",
        useSolidStyle &&
          "bg-[var(--color-surface-glass)] shadow-[var(--shadow-glass)] backdrop-blur-[16px] [-webkit-backdrop-filter:blur(16px)] border-b border-[var(--color-border-subtle)] lg:border-white/40"
      )}
    >

      <div className="container-wide flex h-20 items-center justify-between px-[var(--space-6)]">
        <Link
          href="/"
          className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] focus-visible:ring-offset-2 rounded-lg"
          aria-label={`${COMPANY.shortName} - Trang chủ`}
        >
          <BrandLogo size={48} priority className="drop-shadow-sm" />
          <span className="hidden sm:block">
            <span
              className={cn(
                "block text-[length:var(--text-lg)] font-semibold transition-colors duration-[400ms]",
                useSolidStyle ? "text-[var(--color-text-primary)]" : "text-white"
              )}
            >
              {COMPANY.shortName}
            </span>
            <span
              className={cn(
                "block text-[length:var(--text-xs)] font-normal transition-colors duration-[400ms]",
                useSolidStyle ? "text-[var(--color-text-inverse)]" : "text-white/80"
              )}
            >
              Bảo Vệ Thực Vật
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Điều hướng chính">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={resolveNavHref(link.href)}
              className={cn(
                "text-[length:var(--text-sm)] font-semibold transition-colors duration-[400ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] focus-visible:ring-offset-2 rounded-sm",
                useSolidStyle
                  ? "text-[var(--color-text-primary)] hover:text-[var(--color-text-secondary)]"
                  : "text-white hover:text-white/80"
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mở menu điều hướng"
              className={cn(
                useSolidStyle
                  ? "text-[var(--color-text-primary)]"
                  : "text-white hover:bg-white/10 hover:text-white"
              )}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetTitle className="flex items-center gap-3">
              <BrandLogo size={36} />
              <span>Menu</span>
            </SheetTitle>
            <nav className="flex flex-col gap-4" aria-label="Điều hướng di động">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={resolveNavHref(link.href)}
                  onClick={() => setOpen(false)}
                  className="text-[var(--text-lg)] font-semibold py-2 transition-colors hover:text-[var(--color-text-secondary)]"
                >
                  {link.label}
                </a>
              ))}
              <DealerRegisterButton
                className="mt-4 text-text-tertiary"
                onClick={() => setOpen(false)}
              >
                Trở thành đại lý
              </DealerRegisterButton>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
