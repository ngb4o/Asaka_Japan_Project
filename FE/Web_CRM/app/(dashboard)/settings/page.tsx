"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CloudOff,
  Download,
  HardDriveDownload,
  Monitor,
  Moon,
  RefreshCw,
  Smartphone,
  Sun,
  Type,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DISPLAY_DENSITY_OPTIONS,
  useDisplayDensity,
  type DisplayDensity,
} from "@/components/providers/DisplayDensityProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useNetworkStatus } from "@/components/providers/NetworkStatusProvider";
import { usePwaInstall } from "@/components/providers/PwaInstallProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { clearApiCache } from "@/lib/offline/api-cache";
import { clearMutationQueue } from "@/lib/offline/mutation-queue";
import {
  getLastOfflinePrefetchAt,
  getLastOfflinePrefetchOk,
  prefetchOfflineForUser,
} from "@/lib/offline/prefetch";
import { flushOfflineSync } from "@/lib/offline/sync";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light" as const, label: "Sáng", icon: Sun },
  { value: "dark" as const, label: "Tối", icon: Moon },
  { value: "system" as const, label: "Hệ thống", icon: Monitor },
];

export default function SettingsPage() {
  const { density, setDensity } = useDisplayDensity();
  const { theme, setTheme } = useTheme();
  const { online, pendingMutations, viewingCachedData } = useNetworkStatus();
  const { installed, canPrompt, isIos, promptInstall } = usePwaInstall();
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchAt, setPrefetchAt] = useState<number | null>(null);
  const [prefetchOk, setPrefetchOk] = useState<number | null>(null);

  useEffect(() => {
    setPrefetchAt(getLastOfflinePrefetchAt());
    setPrefetchOk(getLastOfflinePrefetchOk());
  }, []);

  return (
    <div className="space-y-3">
      <PageHeader title="Cài đặt" />

      <Card>
        <CardHeader showOnMobile>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-4 w-4 text-[var(--color-text-secondary)]" />
            Hiển thị kích thước
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-inverse)]">
            Chọn cỡ chữ cho toàn bộ giao diện CRM. Áp dụng ngay, lưu trên thiết bị
            này.
          </p>

          <div className="grid gap-2 sm:grid-cols-3">
            {DISPLAY_DENSITY_OPTIONS.map((option) => {
              const selected = density === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDensity(option.value)}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-[var(--radius-card)] border px-3.5 py-3 text-left transition-all",
                    selected
                      ? "border-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/8 shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-text-secondary)]/30"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-muted)]"
                  )}>
                  <span
                    className="font-semibold text-[var(--color-text-primary)]"
                    style={{ fontSize: densitySamplePx(option.value) }}>
                    Aa · {option.label}
                  </span>
                  <span className="text-xs text-[var(--color-text-inverse)]">
                    {option.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader showOnMobile>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-[var(--color-text-secondary)]" />
            Giao diện
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--color-text-inverse)]">
            Chế độ sáng / tối cho toàn bộ ứng dụng.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {THEME_OPTIONS.map((option) => {
              const selected = theme === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--radius-card)] border px-3.5 py-3 text-left transition-all",
                    selected
                      ? "border-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/8 shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-text-secondary)]/30"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-muted)]"
                  )}>
                  <Icon className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader showOnMobile>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-[var(--color-text-secondary)]" />
            Cài đặt ứng dụng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {installed ? (
            <>
              <p className="text-sm text-[var(--color-text-inverse)]">
                ASAKA CRM đã được cài trên thiết bị này và mở như ứng dụng.
              </p>
              <div className="inline-flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--color-text-secondary)]" />
                Đã cài đặt
              </div>
            </>
          ) : canPrompt ? (
            <>
              <p className="text-sm text-[var(--color-text-inverse)]">
                Thêm ASAKA CRM vào màn hình chính để mở nhanh, dùng offline tốt hơn
                và nhận thông báo.
              </p>
              <Button
                type="button"
                variant="outline"
                loading={installing}
                disabled={installing}
                onClick={() => {
                  setInstalling(true);
                  void promptInstall()
                    .then((outcome) => {
                      if (outcome === "accepted") {
                        toast.success("Đã cài đặt ứng dụng.");
                      } else if (outcome === "dismissed") {
                        toast.info("Đã hủy cài đặt.");
                      } else {
                        toast.error(
                          "Không mở được hộp thoại cài đặt. Thử lại sau."
                        );
                      }
                    })
                    .finally(() => setInstalling(false));
                }}>
                <Download className="h-4 w-4" />
                Cài đặt ứng dụng
              </Button>
            </>
          ) : isIos ? (
            <>
              <p className="text-sm text-[var(--color-text-inverse)]">
                Trên iPhone / iPad, Safari không hỗ trợ nút cài tự động. Làm như
                sau:
              </p>
              <ol className="list-decimal space-y-1.5 pl-4 text-sm text-[var(--color-text-primary)]">
                <li>
                  Mở trang này bằng <strong>Safari</strong>
                </li>
                <li>
                  Bấm nút <strong>Chia sẻ</strong> (ô vuông có mũi tên lên)
                </li>
                <li>
                  Chọn <strong>Thêm vào Màn hình chính</strong>
                </li>
              </ol>
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-inverse)]">
              Trình duyệt hiện tại chưa sẵn sàng cài PWA. Dùng Chrome hoặc Edge
              trên Android, hoặc mở menu trình duyệt → “Cài đặt ứng dụng” /
              “Thêm vào màn hình chính” khi có sẵn.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader showOnMobile>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="h-4 w-4 text-[var(--color-text-secondary)]" />
            Offline & đồng bộ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-inverse)]">
            Sau đăng nhập, app tự tải sẵn danh sách theo quyền (đơn, kho, chuyến…)
            và cache giao diện để mở PWA khi mất mạng vẫn vào được UI. Thao tác ghi
            khi offline sẽ tự gửi lại khi có mạng.
          </p>
          <div
            className={cn(
              "grid gap-2",
              pendingMutations > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"
            )}>
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3.5 py-3">
              <p className="text-xs text-[var(--color-text-inverse)]">Kết nối</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                {online ? "Online" : "Offline"}
              </p>
            </div>
            {pendingMutations > 0 ? (
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3.5 py-3">
                <p className="text-xs text-[var(--color-text-inverse)]">Chờ đồng bộ</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                  {pendingMutations} thao tác
                </p>
              </div>
            ) : null}
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3.5 py-3">
              <p className="text-xs text-[var(--color-text-inverse)]">Nguồn dữ liệu</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                {viewingCachedData ? "Bản đã lưu" : "Máy chủ"}
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3.5 py-3 sm:col-span-2">
              <p className="text-xs text-[var(--color-text-inverse)]">
                Prefetch offline
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                {prefetchAt
                  ? `${prefetchOk ?? 0} nguồn · ${formatPrefetchTime(prefetchAt)}`
                  : "Chưa tải sẵn"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || prefetching || !online || !user}
              loading={prefetching}
              onClick={() => {
                setPrefetching(true);
                void prefetchOfflineForUser(user, { force: true })
                  .then((result) => {
                    setPrefetchAt(result.at);
                    setPrefetchOk(result.ok);
                    if (result.skipped) {
                      toast.info("Không thể prefetch lúc này.");
                    } else if (result.failed > 0) {
                      toast.info(
                        `Đã tải ${result.ok} nguồn (${result.failed} lỗi).`
                      );
                    } else {
                      toast.success(
                        `Đã tải sẵn ${result.ok} nguồn cho offline.`
                      );
                    }
                  })
                  .finally(() => setPrefetching(false));
              }}>
              <HardDriveDownload className="h-4 w-4" />
              Tải sẵn offline
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !online}
              loading={busy}
              onClick={() => {
                setBusy(true);
                void flushOfflineSync()
                  .then((result) => {
                    if (result.flushed > 0) {
                      toast.success(`Đã đồng bộ ${result.flushed} thao tác.`);
                    } else {
                      toast.info("Không có thao tác chờ đồng bộ.");
                    }
                  })
                  .finally(() => setBusy(false));
              }}>
              <RefreshCw className="h-4 w-4" />
              Đồng bộ ngay
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || prefetching}
              onClick={() => {
                void (async () => {
                  await clearApiCache();
                  await clearMutationQueue();
                  try {
                    window.localStorage.removeItem("crm_offline_prefetch_at");
                    window.localStorage.removeItem("crm_offline_prefetch_ok");
                  } catch {
                    // ignore
                  }
                  setPrefetchAt(null);
                  setPrefetchOk(null);
                  toast.success("Đã xóa dữ liệu offline trên thiết bị này.");
                })();
              }}>
              Xóa cache offline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatPrefetchTime(at: number) {
  try {
    return new Date(at).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function densitySamplePx(value: DisplayDensity) {
  if (value === "sm") return 14;
  if (value === "lg") return 20;
  return 16;
}
