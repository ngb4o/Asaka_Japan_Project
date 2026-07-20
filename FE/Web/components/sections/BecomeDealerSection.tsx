"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { COMPANY } from "@/lib/constants";
import { IMAGES } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { FadeUp } from "@/components/motion/FadeUp";
import { useDealerRegister } from "@/lib/dealer/DealerRegisterProvider";

export function BecomeDealerSection() {
  const { openDealerRegister } = useDealerRegister();
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!registered) return;
    const timer = window.setTimeout(() => setRegistered(false), 6000);
    return () => window.clearTimeout(timer);
  }, [registered]);

  function handleRegisterSuccess() {
    setRegistered(true);
  }

  return (
    <section id="dealer" aria-labelledby="dealer-heading" className="relative overflow-hidden">
      <Image
        src={IMAGES.backgrounds.dealerCta}
        alt="Kho logistics phân phối sản phẩm nông nghiệp"
        fill
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/65" />

      <div className="section-padding relative z-10">
        <div className="container-wide">
          <FadeUp>
            <div className="mx-auto max-w-3xl rounded-[var(--radius-card)] glass-light p-8 text-center shadow-[var(--shadow-glass)] md:p-10">
              <p className="text-[var(--text-sm)] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                Cơ hội kinh doanh
              </p>
              <h2
                id="dealer-heading"
                className="mt-3 text-headline font-semibold text-[var(--color-text-primary)]"
              >
                Gia nhập mạng lưới đại lý ASAKA JAPAN
              </h2>
              <p className="mt-3 text-[var(--text-md)] font-normal leading-relaxed text-[var(--color-text-inverse)]">
                Cơ hội kinh doanh bền vững với sản phẩm chất lượng cao, chính sách hỗ trợ cạnh tranh và đội ngũ kỹ thuật chuyên nghiệp. Hãy trở thành đối tác của chúng tôi ngay hôm nay.
              </p>
              {registered ? (
                <p
                  role="status"
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-text-secondary)]/30 bg-[var(--color-text-secondary)]/10 px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" />
                  Đăng ký thành công! Chúng tôi sẽ liên hệ với bạn sớm.
                </p>
              ) : null}
              <div className="mt-6 flex flex-nowrap items-center justify-center gap-2 sm:gap-4">
                <Button
                  size="sm"
                  className="shrink-0 text-white md:h-14 md:px-10 md:text-[length:var(--text-lg)]"
                  onClick={() =>
                    openDealerRegister({ onSuccess: handleRegisterSuccess })
                  }
                >
                  Đăng ký đại lý
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="shrink-0 md:h-14 md:px-10 md:text-[length:var(--text-lg)]"
                >
                  <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>
                    {COMPANY.phone}
                  </a>
                </Button>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
