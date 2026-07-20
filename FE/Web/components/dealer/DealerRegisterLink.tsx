"use client";

import { useDealerRegister } from "@/lib/dealer/DealerRegisterProvider";
import { cn } from "@/lib/utils";

type DealerRegisterLinkProps = {
  children: React.ReactNode;
  className?: string;
  onAfterClick?: () => void;
};

export function DealerRegisterLink({
  children,
  className,
  onAfterClick,
}: DealerRegisterLinkProps) {
  const { openDealerRegister } = useDealerRegister();

  return (
    <button
      type="button"
      className={cn("text-left", className)}
      onClick={() => {
        openDealerRegister();
        onAfterClick?.();
      }}
    >
      {children}
    </button>
  );
}
