"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useDealerRegister } from "@/lib/dealer/DealerRegisterProvider";

type DealerRegisterButtonProps = ButtonProps & {
  onRegisterSuccess?: () => void;
};

export function DealerRegisterButton({
  onRegisterSuccess,
  onClick,
  children = "Trở thành đại lý",
  ...props
}: DealerRegisterButtonProps) {
  const { openDealerRegister } = useDealerRegister();

  return (
    <Button
      {...props}
      onClick={(event) => {
        onClick?.(event);
        openDealerRegister({ onSuccess: onRegisterSuccess });
      }}
    >
      {children}
    </Button>
  );
}
