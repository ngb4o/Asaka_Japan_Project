"use client";

import { COMPANY_STATS } from "@/lib/constants";
import { SectionShell } from "@/components/layout/SectionShell";
import { Counter } from "@/components/motion/Counter";
import { StaggerChildren } from "@/components/motion/StaggerChildren";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { cn } from "@/lib/utils";

export function StatsSection() {
  return (
    <SectionShell
      id="stats"
      dark
      eyebrow="Con số ấn tượng"
      title="Quy mô và năng lực vượt trội"
      subtitle="Những con số phản ánh cam kết lâu dài của chúng tôi với ngành nông nghiệp Việt Nam."
    >
      <StaggerChildren className="grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-5">
        {COMPANY_STATS.map((stat, index) => {
          const isLastOdd =
            index === COMPANY_STATS.length - 1 && COMPANY_STATS.length % 2 === 1;

          return (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className={cn(
                "text-center lg:text-left",
                isLastOdd && "col-span-2 lg:col-span-1"
              )}
            >
              <p className="text-[var(--text-3xl)] font-semibold text-[var(--color-text-tertiary)] md:text-[clamp(2rem,4vw,3rem)]">
                <Counter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-[var(--text-sm)] font-normal text-white/65">
                {stat.label}
              </p>
            </motion.div>
          );
        })}
      </StaggerChildren>
    </SectionShell>
  );
}
