"use client";

import { DealerRegisterProvider } from "@/lib/dealer/DealerRegisterProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DealerRegisterProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </DealerRegisterProvider>
  );
}
