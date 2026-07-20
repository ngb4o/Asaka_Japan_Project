"use client";

import { DealerRegisterProvider } from "@/lib/dealer/DealerRegisterProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <DealerRegisterProvider>{children}</DealerRegisterProvider>;
}
