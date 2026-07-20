import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { COMPANY, FOOTER_LINKS } from "@/lib/constants";
import { FooterSupportLinks } from "@/components/layout/FooterSupportLinks";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer id="contact" className="bg-[var(--color-surface-base)] text-[var(--color-text-tertiary)]">
      <div className="section-padding pb-8">
        <div className="container-wide">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4">
              <Link href="/" className="flex items-center gap-3" aria-label={`${COMPANY.shortName} - Trang chủ`}>
                <BrandLogo size={48} />
                <span>
                  <span className="block text-[var(--text-lg)] font-semibold">{COMPANY.shortName}</span>
                  <span className="block text-[var(--text-xs)] font-normal text-white/60">
                    Bảo Vệ Thực Vật
                  </span>
                </span>
              </Link>
              <p className="mt-6 max-w-sm text-[var(--text-md)] font-normal leading-relaxed text-white/70">
                Kiến tạo tương lai nông nghiệp bền vững với giải pháp bảo vệ thực vật chất lượng cao.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:col-span-4">
              <div>
                <h3 className="text-[var(--text-sm)] font-semibold uppercase tracking-widest text-white/50">
                  Công ty
                </h3>
                <ul className="mt-4 space-y-3">
                  {FOOTER_LINKS.company.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-[var(--text-md)] font-normal text-white/80 transition-colors hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] rounded-sm"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[var(--text-sm)] font-semibold uppercase tracking-widest text-white/50">
                  Hỗ trợ
                </h3>
                <FooterSupportLinks />
              </div>
            </div>

            <div className="col-span-full lg:col-span-4">
              <h3 className="text-[var(--text-sm)] font-semibold uppercase tracking-widest text-white/50">
                Liên hệ
              </h3>
              <ul className="mt-4 space-y-4">
                <li className="flex gap-3">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" aria-hidden="true" />
                  <a
                    href={COMPANY.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--text-md)] font-normal text-white/80 transition-colors hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] rounded-sm"
                  >
                    {COMPANY.address}
                  </a>
                </li>
                <li className="flex gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" aria-hidden="true" />
                  <a
                    href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                    className="text-[var(--text-md)] font-normal text-white/80 hover:text-[var(--color-text-secondary)] transition-colors"
                  >
                    {COMPANY.phone}
                  </a>
                </li>
                <li className="flex gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" aria-hidden="true" />
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="text-[var(--text-md)] font-normal text-white/80 hover:text-[var(--color-text-secondary)] transition-colors"
                  >
                    {COMPANY.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="relative left-1/2 mt-8 w-screen max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-hidden rounded-[var(--radius-card)] sm:max-w-[calc(100vw-40px)] lg:max-w-[calc(100vw-64px)]">
            <iframe
              title="Bản đồ vị trí Công ty ASAKA JAPAN"
              src={COMPANY.mapEmbedUrl}
              className="h-64 w-full border-0 transition-[filter] duration-[400ms] hover:grayscale-0 md:h-72 lg:h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>

          <Separator className="my-6 bg-white/10" />

          <p className="text-center text-[var(--text-sm)] font-normal text-white/50">
            © {new Date().getFullYear()} {COMPANY.name}. Bảo lưu mọi quyền.
          </p>
        </div>
      </div>
    </footer>
  );
}
