"use client";

import Image from "next/image";
import { ABOUT_CONTENT, CORE_VALUES } from "@/lib/constants";
import { IMAGES } from "@/lib/images";
import { SectionShell } from "@/components/layout/SectionShell";
import { FadeUp } from "@/components/motion/FadeUp";

export function AboutSection() {
  return (
    <SectionShell
      id="about"
      eyebrow="Về ASAKA JAPAN"

      title="Đồng hành cùng nền nông nghiệp Việt Nam"

      subtitle="Chuyên phân phối thuốc bảo vệ thực vật và giải pháp bảo vệ cây trồng chất lượng, đồng hành cùng đại lý và bà con nông dân trên toàn quốc."
      className="organic-bg"
    >
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <FadeUp className="relative aspect-[6/4] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-elevated)] lg:sticky lg:top-28">
          <Image
            src={IMAGES.backgrounds.about}
            alt="Công ty TNHH ASAKA JAPAN"
            fill
            className="object-cover transition-transform duration-[600ms] hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </FadeUp>

        <div className="space-y-8">
          <FadeUp delay={0.1}>
            <div>
              <h3 className="text-[var(--text-xl)] font-semibold text-[var(--color-text-primary)]">
                Tổng quan
              </h3>
              <p className="mt-3 text-[var(--text-md)] font-normal leading-relaxed text-[var(--color-text-inverse)]">
                {ABOUT_CONTENT.overview}
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={0.15}>
            <div>
              <h3 className="text-[var(--text-xl)] font-semibold text-[var(--color-text-primary)]">
                Sứ mệnh & Tầm nhìn
              </h3>
              <p className="mt-3 text-[var(--text-md)] font-normal leading-relaxed text-[var(--color-text-inverse)]">
                {ABOUT_CONTENT.missionVision}
              </p>
            </div>
          </FadeUp>
        </div>
      </div>
    </SectionShell>
  );
}
