"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ContactForm } from "@/components/forms/ContactForm";

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

  return (
    <DealerRegisterContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) closeDealerRegister();
          else setOpen(true);
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-6 sm:p-8">
          <DialogTitle>Đăng ký trở thành đại lý</DialogTitle>
          <ContactForm
            type="dealer"
            submitLabel="Gửi đăng ký"
            theme="light"
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
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
