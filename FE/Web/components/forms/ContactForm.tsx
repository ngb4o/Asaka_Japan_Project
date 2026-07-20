"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitLead } from "@/lib/api/leads";
import { ApiClientError } from "@/lib/api/client";

type ContactFormProps = {
  type?: "contact" | "dealer";
  title?: string;
  submitLabel?: string;
  className?: string;
  theme?: "dark" | "light";
  onSuccess?: () => void;
};

export function ContactForm({
  type = "contact",
  title,
  submitLabel,
  className = "",
  theme = "dark",
  onSuccess,
}: ContactFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [region, setRegion] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fieldClassName =
    theme === "light"
      ? "w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-inverse)] outline-none transition-colors focus:border-[var(--color-text-secondary)]"
      : "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-[var(--color-text-secondary)]";
  const labelClassName =
    theme === "light"
      ? "mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]"
      : "mb-1.5 block text-sm font-medium text-white/80";
  const titleClassName =
    theme === "light" ? "text-lg font-semibold" : "text-lg font-semibold text-white";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!name.trim() || !phone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại");
      return;
    }

    setSubmitting(true);
    try {
      await submitLead({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        company: company.trim(),
        region: region.trim(),
        message: message.trim(),
        type,
        source: "website",
      });
      setName("");
      setPhone("");
      setEmail("");
      setCompany("");
      setRegion("");
      setMessage("");
      onSuccess?.();
      if (!onSuccess) setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Gửi thất bại, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {title ? <h3 className={titleClassName}>{title}</h3> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${type}-name`} className={labelClassName}>
            Họ tên *
          </label>
          <input
            id={`${type}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClassName}
          />
        </div>
        <div>
          <label htmlFor={`${type}-phone`} className={labelClassName}>
            Số điện thoại *
          </label>
          <input
            id={`${type}-phone`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClassName}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${type}-email`} className={labelClassName}>
            Email
          </label>
          <input
            id={`${type}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClassName}
          />
        </div>
        <div>
          <label htmlFor={`${type}-region`} className={labelClassName}>
            Khu vực
          </label>
          <input
            id={`${type}-region`}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={fieldClassName}
          />
        </div>
      </div>

      {type === "dealer" ? (
        <div>
          <label htmlFor={`${type}-company`} className={labelClassName}>
            Tên cửa hàng / công ty
          </label>
          <input
            id={`${type}-company`}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={fieldClassName}
          />
        </div>
      ) : null}

      <div>
        <label htmlFor={`${type}-message`} className={labelClassName}>
          Nội dung
        </label>
        <textarea
          id={`${type}-message`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${fieldClassName} min-h-[100px] resize-y`}
        />
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {success ? (
        <p className="text-sm text-green-600">
          Cảm ơn bạn! Chúng tôi đã nhận thông tin và sẽ liên hệ sớm.
        </p>
      ) : null}

      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={submitting}
          className="w-full text-white sm:w-auto"
        >
          {submitting ? "Đang gửi..." : submitLabel || "Gửi liên hệ"}
        </Button>
      </div>
    </form>
  );
}
