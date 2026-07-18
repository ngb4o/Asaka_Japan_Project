"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiClientError } from "@/lib/api/client";

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await register(email, password, username);
      toast.success("Đăng ký thành công");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Đăng ký thất bại"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Tạo tài khoản"
      subtitle="Đăng ký tài khoản quản trị nội bộ"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Họ tên / Username</Label>
          <Input
            id="username"
            autoComplete="name"
            placeholder="Nguyễn Văn A"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@asaka-japan.com"
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
            autoComplete="new-password"
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Đang đăng ký..." : "Đăng ký"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--color-text-inverse)]">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--color-text-secondary)] transition-colors hover:underline"
        >
          Đăng nhập
        </Link>
      </p>
    </AuthShell>
  );
}
