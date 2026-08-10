"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type PageEnterProps = {
  children: React.ReactNode;
  className?: string;
};

/** Fade/slide wrapper — remounts on route change to replay enter animation. */
export function PageEnter({ children, className }: PageEnterProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={cn("crm-page-enter", className)}>
      {children}
    </div>
  );
}
