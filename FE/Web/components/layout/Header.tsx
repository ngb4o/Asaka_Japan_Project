"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { NAV_LINKS, COMPANY } from "@/lib/constants";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
        scrolled &&
        "lg:bg-[var(--color-surface-glass)] lg:shadow-[var(--shadow-glass)] lg:backdrop-blur-[16px] lg:[-webkit-backdrop-filter:blur(16px)] lg:border-b lg:border-white/40"
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
                scrolled ? "text-[var(--color-text-primary)]" : "text-white"
              )}
            >
              {COMPANY.shortName}
            </span>
            <span
              className={cn(
                "block text-[length:var(--text-xs)] font-normal transition-colors duration-[400ms]",
                scrolled ? "text-[var(--color-text-inverse)]" : "text-white/80"
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
              href={link.href}
              className={cn(
                "text-[length:var(--text-sm)] font-semibold transition-colors duration-[400ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] focus-visible:ring-offset-2 rounded-sm",
                scrolled
                  ? "text-[var(--color-text-primary)] hover:text-[var(--color-text-secondary)]"
                  : "text-white hover:text-white/80"
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Button
            asChild
            size="sm"
            className="bg-[var(--color-text-secondary)] text-white hover:bg-[#016502]"
          >
            <a href="#dealer">Trở thành đại lý</a>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mở menu điều hướng"
              className={cn(
                scrolled
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
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-[var(--text-lg)] font-semibold py-2 transition-colors hover:text-[var(--color-text-secondary)]"
                >
                  {link.label}
                </a>
              ))}
              <Button asChild className="mt-4 text-text-tertiary">
                <a href="#dealer" onClick={() => setOpen(false)}>
                  Trở thành đại lý
                </a>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
