"use client";

import { WHY_CHOOSE } from "@/lib/constants";
import { SectionShell } from "@/components/layout/SectionShell";
import { StaggerChildren } from "@/components/motion/StaggerChildren";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

export function WhyChooseSection() {
  return (
    <SectionShell
      id="why-choose"
      eyebrow="Lý do lựa chọn"
      title="Tại sao chọn ASAKA JAPAN?"
      subtitle="Đối tác tin cậy của hàng nghìn đại lý và nông dân trên khắp Việt Nam."
    >
      <StaggerChildren className="grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6">
        {WHY_CHOOSE.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.article
              key={feature.title}
              variants={fadeUp}
              className="group glass-light rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-soft)] transition-all duration-[400ms] hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)] sm:p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)] transition-transform duration-[400ms] group-hover:scale-105 sm:h-12 sm:w-12">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)] sm:mt-4 sm:text-[length:var(--text-lg)]">
                {feature.title}
              </h3>
              <p className="mt-2 text-xs font-normal leading-relaxed text-[var(--color-text-inverse)] sm:mt-3 sm:text-[length:var(--text-sm)]">
                {feature.description}
              </p>
            </motion.article>
          );
        })}
      </StaggerChildren>
    </SectionShell>
  );
}
