"use client";

import { FOOTER_LINKS } from "@/lib/constants";
import { DealerRegisterLink } from "@/components/dealer/DealerRegisterLink";

const linkClassName =
  "text-[var(--text-md)] font-normal text-white/80 transition-colors hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] rounded-sm";

export function FooterSupportLinks() {
  return (
    <ul className="mt-4 space-y-3">
      {FOOTER_LINKS.support.map((link) => (
        <li key={link.href}>
          {link.href === "#dealer" ? (
            <DealerRegisterLink className={linkClassName}>
              {link.label}
            </DealerRegisterLink>
          ) : (
            <a href={link.href} className={linkClassName}>
              {link.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
