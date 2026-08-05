"use client";

import { useState } from "react";
import { MapPin, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

export type GeoLocationValue = {
  lat: number;
  lng: number;
  accuracy?: number | null;
  locationCapturedAt?: string;
  locationSource?: "gps" | "manual";
};

type LocationCaptureProps = {
  value: GeoLocationValue | null;
  onChange: (value: GeoLocationValue | null) => void;
  className?: string;
  /** Bắt buộc trên mobile / khi ghi chi phí ngoài trời */
  label?: string;
};

export function LocationCapture({
  value,
  onChange,
  className,
  label = "Vị trí hiện tại",
}: LocationCaptureProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function capture() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.warning("Thiết bị không hỗ trợ định vị");
      return;
    }

    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      onChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy:
          typeof position.coords.accuracy === "number"
            ? position.coords.accuracy
            : null,
        locationCapturedAt: new Date().toISOString(),
        locationSource: "gps",
      });
      toast.success("Đã lấy vị trí hiện tại");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? Number((err as GeolocationPositionError).code)
          : null;
      if (code === 1) {
        toast.warning("Cần cho phép truy cập vị trí");
      } else if (code === 3) {
        toast.warning("Hết thời gian lấy vị trí — thử lại");
      } else {
        toast.error("Không lấy được vị trí");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={loading}
          onClick={() => void capture()}
        >
          <MapPin className="h-4 w-4" />
          {value ? "Cập nhật vị trí" : label}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            aria-label="Xóa vị trí"
          >
            <X className="h-4 w-4" />
            Xóa
          </Button>
        ) : null}
      </div>
      {value ? (
        <p className="text-xs text-[var(--color-text-inverse)]">
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          {value.accuracy != null && Number.isFinite(value.accuracy)
            ? ` · ±${Math.round(value.accuracy)}m`
            : ""}
        </p>
      ) : (
        <p className="text-xs text-[var(--color-text-inverse)]">
          Tuỳ chọn — gắn GPS lúc check-in / ghi chi
        </p>
      )}
    </div>
  );
}
