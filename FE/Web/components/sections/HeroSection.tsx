"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { HERO_STATS } from "@/lib/constants";
import { IMAGES } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { DealerRegisterButton } from "@/components/dealer/DealerRegisterButton";
import { Counter } from "@/components/motion/Counter";
import { FadeUp } from "@/components/motion/FadeUp";
import { StaggerChildren } from "@/components/motion/StaggerChildren";
import { fadeUp } from "@/lib/animations";
import { useReducedMotion } from "@/components/motion/useReducedMotion";

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id="hero"
      aria-label="Giới thiệu chính"
      className="relative flex min-h-dvh items-center overflow-hidden"
    >
      <Image
        src={IMAGES.backgrounds.hero}
        alt="Cánh đồng nông nghiệp nhìn từ drone"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />

      <div className="relative z-10 w-full pb-12 pt-28 md:pb-16 md:pt-36">
        <div className="container-wide px-[var(--space-6)]">
          <StaggerChildren className="max-w-4xl text-white">
            <motion.p
              variants={fadeUp}
              className="mb-4 text-[length:var(--text-sm)] font-semibold uppercase tracking-[0.2em] text-white"
            >
              Công ty TNHH ASAKA - JAPAN
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-display font-semibold text-white"
            >
              Kiến tạo tương lai nông nghiệp bền vững cùng ASAKA - JAPAN
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-2xl text-[length:var(--text-md)] font-normal leading-relaxed text-white md:text-[length:var(--text-lg)]"
            >
              ASAKA JAPAN chuyên cung cấp các giải pháp bảo vệ thực vật, xây dựng mạng lưới hợp tác bền vững với đại lý và đối tác trên nhiều tỉnh thành.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-3 md:gap-4">
              <DealerRegisterButton
                size="lg"
                className="h-10 px-5 text-[length:var(--text-sm)] bg-[var(--color-text-secondary)] text-white hover:bg-[#016502] md:h-14 md:px-10 md:text-[length:var(--text-lg)]"
              >
                Trở thành đại lý
              </DealerRegisterButton>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="h-10 px-5 text-[length:var(--text-sm)] border-white text-white hover:bg-white/10 md:h-14 md:px-10 md:text-[length:var(--text-lg)]"
              >
                <a href="#products">Khám phá sản phẩm</a>
              </Button>
            </motion.div>
          </StaggerChildren>
        </div>
      </div>

      <a
        href="#about"
        aria-label="Cuộn xuống phần giới thiệu"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[var(--color-text-tertiary)] opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] rounded-full p-2"
      >
        <motion.div
          animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ChevronDown className="h-8 w-8" aria-hidden="true" />
        </motion.div>
      </a>
    </section>
  );
}
