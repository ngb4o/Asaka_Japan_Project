"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { ContactForm } from "@/components/forms/ContactForm";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

type OpenOptions = {
  onSuccess?: () => void;
};

type DealerRegisterContextValue = {
  openDealerRegister: (options?: OpenOptions) => void;
  closeDealerRegister: () => void;
};

const DealerRegisterContext = createContext<DealerRegisterContextValue | null>(
  null
);

export function DealerRegisterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const onSuccessRef = useRef<(() => void) | undefined>(undefined);

  const openDealerRegister = useCallback((options?: OpenOptions) => {
    onSuccessRef.current = options?.onSuccess;
    setOpen(true);
  }, []);

  const closeDealerRegister = useCallback(() => {
    setOpen(false);
    onSuccessRef.current = undefined;
  }, []);

  function handleSuccess() {
    setOpen(false);
    onSuccessRef.current?.();
    onSuccessRef.current = undefined;
  }

  const value = useMemo(
    () => ({ openDealerRegister, closeDealerRegister }),
    [openDealerRegister, closeDealerRegister]
  );

  function handleOpenChange(next: boolean) {
    if (!next) closeDealerRegister();
    else setOpen(true);
  }

  const registerForm = (
    <ContactForm
      type="dealer"
      submitLabel="Gửi đăng ký"
      theme="light"
      onSuccess={handleSuccess}
    />
  );

  return (
    <DealerRegisterContext.Provider value={value}>
      {children}
      {isMobile ? (
        <BottomSheet
          open={open}
          onOpenChange={handleOpenChange}
          title="Đăng ký trở thành đại lý"
          maxHeight="92dvh"
        >
          <div className="px-4 pb-6 pt-2">{registerForm}</div>
        </BottomSheet>
      ) : (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-6 sm:p-8">
            <DialogTitle>Đăng ký trở thành đại lý</DialogTitle>
            {registerForm}
          </DialogContent>
        </Dialog>
      )}
    </DealerRegisterContext.Provider>
  );
}

export function useDealerRegister() {
  const context = useContext(DealerRegisterContext);
  if (!context) {
    throw new Error("useDealerRegister must be used within DealerRegisterProvider");
  }
  return context;
}
