"use client";

import { MANUFACTURING_STEPS } from "@/lib/constants";
import { SectionShell } from "@/components/layout/SectionShell";
import { FadeUp } from "@/components/motion/FadeUp";
import { StaggerChildren } from "@/components/motion/StaggerChildren";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { useReducedMotion } from "@/components/motion/useReducedMotion";

export function ManufacturingSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <SectionShell
      id="process"
      eyebrow="Quy trình làm việc"
      title="Từ lựa chọn sản phẩm đến giao hàng"
      subtitle="Chúng tôi kiểm soát chặt chẽ từng bước nhằm mang đến sản phẩm chất lượng và dịch vụ chuyên nghiệp."
    >
      {/* Mobile / tablet: 2 cards per row */}
      <StaggerChildren className="grid grid-cols-2 gap-3 sm:gap-5 lg:hidden">
        {MANUFACTURING_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === MANUFACTURING_STEPS.length - 1;
          const isOddCount = MANUFACTURING_STEPS.length % 2 === 1;

          return (
            <motion.article
              key={step.title}
              variants={fadeUp}
              className={`group glass-light rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-soft)] transition-all duration-[400ms] hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)] sm:p-5 ${
                isLast && isOddCount ? "col-span-2" : ""
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-text-secondary)] text-white transition-transform duration-[400ms] group-hover:scale-105 sm:h-12 sm:w-12">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              </span>
              <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                Bước {index + 1}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-[var(--color-text-primary)] sm:text-[length:var(--text-lg)]">
                {step.title}
              </h3>
              <p className="mt-2 text-xs font-normal leading-relaxed text-[var(--color-text-inverse)] sm:text-[length:var(--text-sm)]">
                {step.description}
              </p>
            </motion.article>
          );
        })}
      </StaggerChildren>

      {/* Desktop: timeline */}
      <div className="relative hidden lg:block">
        <div
          className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[var(--color-text-secondary)]/20"
          aria-hidden="true"
        />

        <ol className="space-y-0">
          {MANUFACTURING_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;

            return (
              <FadeUp key={step.title} delay={index * 0.08}>
                <li className="relative grid grid-cols-2 gap-12 pb-12">
                  <div
                    className={`flex gap-0 ${
                      isEven
                        ? "col-start-1 justify-end pr-12 text-right"
                        : "col-start-2 pl-12"
                    }`}
                  >
                    <span
                      className={`absolute left-1/2 top-0 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-[var(--color-text-secondary)] text-white ${
                        !prefersReducedMotion
                          ? "transition-transform duration-[400ms] hover:scale-110"
                          : ""
                      }`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>

                    <div className="flex-1">
                      <span className="text-[var(--text-xs)] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                        Bước {index + 1}
                      </span>
                      <h3 className="mt-1 text-[var(--text-xl)] font-semibold text-[var(--color-text-primary)]">
                        {step.title}
                      </h3>
                      <p
                        className={`mt-2 max-w-md text-[var(--text-md)] font-normal leading-relaxed text-[var(--color-text-inverse)] ${
                          isEven ? "ml-auto" : ""
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                </li>
              </FadeUp>
            );
          })}
        </ol>
      </div>
    </SectionShell>
  );
}
