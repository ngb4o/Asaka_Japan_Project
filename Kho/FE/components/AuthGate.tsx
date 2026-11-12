"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LoginScreen } from "@/components/LoginScreen";
import { currentUser } from "@/lib/api";
import { clearToken, getToken } from "@/lib/session";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<"checking" | "guest" | "in">("checking");
  const [accountName, setAccountName] = useState("");

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setSession("guest");
      return;
    }
    currentUser()
      .then((user) => {
        if (!active) return;
        setAccountName(user.name);
        setSession("in");
      })
      .catch(() => {
        if (!active) return;
        clearToken();
        setSession("guest");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onUnauthorized() {
      setAccountName("");
      setSession("guest");
    }
    window.addEventListener("kho-unauthorized", onUnauthorized);
    return () => window.removeEventListener("kho-unauthorized", onUnauthorized);
  }, []);

  function logout() {
    clearToken();
    setAccountName("");
    setSession("guest");
  }

  if (session === "checking") {
    return <div className="h-full animate-pulse bg-[#f1f5f9]" />;
  }

  if (session === "guest") {
    return (
      <LoginScreen
        onSuccess={(user) => {
          setAccountName(user.name);
          setSession("in");
        }}
      />
    );
  }

  return (
    <AppShell accountName={accountName} onLogout={logout}>
      {children}
    </AppShell>
  );
}
