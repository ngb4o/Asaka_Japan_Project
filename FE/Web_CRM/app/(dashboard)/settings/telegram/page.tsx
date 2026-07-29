"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManageTelegram } from "@/lib/auth/permissions";
import { ApiClientError } from "@/lib/api/client";
import {
  deleteTelegramContact,
  getTelegramContacts,
  getTelegramStatus,
  sendTelegramTest,
  upsertTelegramContact,
  type TelegramContact,
  type TelegramStatus,
} from "@/lib/api/telegram";

const BOT_URL = "https://t.me/asaka_japan_noti_bot";

type FormState = {
  chatId: string;
  displayName: string;
  phone: string;
};

const EMPTY_FORM: FormState = {
  chatId: "",
  displayName: "",
  phone: "",
};

export default function TelegramSettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [items, setItems] = useState<TelegramContact[]>([]);
  const [envStaffChatIds, setEnvStaffChatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [busyChatId, setBusyChatId] = useState<string | null>(null);

  const allowed = canManageTelegram(user?.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const contactsResult = await getTelegramContacts({
        role: "staff",
        limit: 100,
        page: 1,
      });
      setItems(contactsResult.items || []);
      setEnvStaffChatIds(contactsResult.envStaffChatIds || []);

      // Status gọi Telegram getMe — không chặn list nếu chậm
      try {
        const statusResult = await getTelegramStatus();
        setStatus(statusResult);
      } catch {
        setStatus((prev) => prev);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Không tải được cấu hình Telegram"
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (allowed) loadData();
  }, [allowed, loadData]);

  const envOnlyRecipients = useMemo(() => {
    const dbIds = new Set(items.map((item) => String(item.chatId)));
    return envStaffChatIds.filter((id) => !dbIds.has(String(id)));
  }, [envStaffChatIds, items]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const chatId = form.chatId.trim();
    if (!chatId) {
      toast.error("Vui lòng nhập Chat ID");
      return;
    }

    setSubmitting(true);
    try {
      await upsertTelegramContact({
        chatId,
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        role: "staff",
      });
      toast.success("Đã thêm người nhận nội bộ");
      setOpen(false);
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không lưu được người nhận"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTest(chatId?: string) {
    const key = chatId || "__staff__";
    setBusyChatId(key);
    try {
      await sendTelegramTest(
        chatId
          ? {
              chatId,
              text: "ASAKA CRM — Tin thử đến người nhận nội bộ.",
            }
          : {
              staff: true,
              text: "ASAKA CRM — Tin thử đến toàn bộ staff.",
            }
      );
      toast.success("Đã gửi tin thử — kiểm tra Telegram");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Gửi tin thử thất bại"
      );
    } finally {
      setBusyChatId(null);
    }
  }

  async function handleDelete(contact: TelegramContact) {
    if (
      !window.confirm(
        `Xóa người nhận ${contact.displayName || contact.chatId}?`
      )
    ) {
      return;
    }

    setBusyChatId(contact.chatId);
    try {
      await deleteTelegramContact(contact.chatId);
      toast.success("Đã xóa người nhận");
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không xóa được người nhận"
      );
    } finally {
      setBusyChatId(null);
    }
  }

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Thông báo Telegram" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-text-inverse)]">
            Chỉ quản trị viên mới được cấu hình người nhận Telegram nội bộ.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <PageSkeleton {...PAGE_SKELETONS.warehouses} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thông báo Telegram"
        description="Thêm Chat ID nhân sự để nhận toàn bộ thông báo CRM (đơn hàng, công nợ, lead, chuyến, tồn kho). Đại lý/khách không cần cài bot."
        actions={
          <>
            <Button variant="outline" onClick={() => loadData()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tải lại
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTest()}
              disabled={busyChatId === "__staff__"}
            >
              <Send className="mr-2 h-4 w-4" />
              Gửi thử tất cả
            </Button>
            <Button
              onClick={() => {
                setForm(EMPTY_FORM);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm người nhận
            </Button>
          </>
        }
        fab={{
          onClick: () => {
            setForm(EMPTY_FORM);
            setOpen(true);
          },
          label: "Thêm người nhận",
        }}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trạng thái bot</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={status?.enabled ? "success" : "muted"}>
            {status?.enabled ? "Đang bật" : "Đang tắt"}
          </Badge>
          {status?.botUsername ? (
            <Badge variant="muted">@{status.botUsername}</Badge>
          ) : null}
          <Badge variant="muted">
            Mode: {status?.mode === "webhook" ? "Webhook" : "Polling local"}
          </Badge>
          <Badge variant="default">
            Người nhận: {status?.staffRecipientCount ?? 0}
          </Badge>
          <a
            href={BOT_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[var(--color-text-secondary)] hover:underline"
          >
            Mở bot
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hướng dẫn thêm người</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--color-text-inverse)]">
          <p>1. Người nhận mở bot ASAKA → gửi <strong>/id</strong> hoặc <strong>/start</strong>.</p>
          <p>2. Copy Chat ID hiện ra → bấm “Thêm người nhận” trong trang này.</p>
          <p>3. Bấm “Gửi thử” để xác nhận đã nhận tin.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Người nhận nội bộ ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-text-inverse)]">
              Chưa có người nhận trong CRM. Thêm Chat ID để nhận thông báo nội bộ.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.chatId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {item.displayName || "Chưa đặt tên"}
                    </p>
                    <Badge variant="muted">staff</Badge>
                    {item.fromEnv ? (
                      <Badge variant="default">có trong .env</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-[var(--color-text-inverse)]">
                    Chat ID: {item.chatId}
                    {item.phone ? ` · SĐT: ${item.phone}` : ""}
                    {item.username ? ` · @${item.username}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyChatId === item.chatId}
                    onClick={() => handleTest(item.chatId)}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Gửi thử
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyChatId === item.chatId}
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Xóa
                  </Button>
                </div>
              </div>
            ))
          )}

          {envOnlyRecipients.length > 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--color-border-subtle)] px-4 py-3 text-sm text-[var(--color-text-inverse)]">
              <p className="font-medium text-[var(--color-text-primary)]">
                Chỉ có trong .env (không sửa từ CRM)
              </p>
              <p className="mt-1">{envOnlyRecipients.join(", ")}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm người nhận Telegram</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="chatId">Chat ID *</Label>
              <Input
                id="chatId"
                value={form.chatId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, chatId: e.target.value }))
                }
                placeholder="Ví dụ: 5641491146"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Tên hiển thị</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, displayName: e.target.value }))
                }
                placeholder="VD: Sales Hà Nội"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">SĐT (tuỳ chọn)</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="09xxxxxxx"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
