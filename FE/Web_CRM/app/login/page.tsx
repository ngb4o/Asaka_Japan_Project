"use client";

import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiClientError } from "@/lib/api/client";

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      toast.success("Đăng nhập thành công");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Đăng nhập thất bại"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Truy cập hệ thống quản trị ASAKA CRM"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" loading={submitting}>
          Đăng nhập
        </Button>
      </form>
    </AuthShell>
  );
}
