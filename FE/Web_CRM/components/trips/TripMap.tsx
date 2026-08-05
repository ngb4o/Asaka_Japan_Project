"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ExternalLink } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { TripExpense, TripStop } from "@/lib/types";
import { cn, formatCurrency, formatDateDisplay } from "@/lib/utils";

type TripMapProps = {
  stops: TripStop[];
  expenses: TripExpense[];
  className?: string;
};

type MapPoint = {
  id: string;
  kind: "stop" | "expense";
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  /** Extra lines shown in marker popup (expense details, etc.) */
  detailLines?: string[];
  order?: number;
};

const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const EXPENSE_CATEGORY_LABEL: Record<TripExpense["category"], string> = {
  fuel: "Xăng",
  food: "Ăn uống",
  lodging: "Lưu trú",
  toll: "Cầu đường",
  parking: "Gửi xe",
  other: "Khác",
};

const STOP_PURPOSE_LABEL: Record<string, string> = {
  delivery: "Giao hàng",
  collection: "Thu tiền",
  meeting: "Gặp gỡ",
  other: "Khác",
};

function hasCoords(item: { lat?: number | null; lng?: number | null }) {
  return (
    typeof item.lat === "number" &&
    Number.isFinite(item.lat) &&
    typeof item.lng === "number" &&
    Number.isFinite(item.lng)
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPopupHtml(point: MapPoint) {
  const lines = [
    point.sublabel,
    ...(point.detailLines ?? []),
  ].filter((line): line is string => Boolean(line?.trim()));

  return `<div style="font-family:system-ui,sans-serif;line-height:1.45;min-width:160px;max-width:240px">
    <strong>${escapeHtml(point.label)}</strong>
    ${lines
      .map(
        (line) =>
          `<div style="opacity:.8;font-size:12px;margin-top:2px">${escapeHtml(line)}</div>`
      )
      .join("")}
  </div>`;
}

function formatCoord(lat: number, lng: number) {
  return `${lat},${lng}`;
}

function buildGoogleMapsPointUrl(lat: number, lng: number, label?: string) {
  const params = new URLSearchParams({
    api: "1",
    query: formatCoord(lat, lng),
  });
  if (label?.trim()) {
    params.set("query", `${label.trim()}@${formatCoord(lat, lng)}`);
  }
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function buildGoogleMapsDirectionsUrl(
  routePoints: Array<Pick<MapPoint, "lat" | "lng">>
) {
  if (routePoints.length === 0) return null;
  if (routePoints.length === 1) {
    return buildGoogleMapsPointUrl(routePoints[0].lat, routePoints[0].lng);
  }

  const [origin, ...rest] = routePoints;
  const destination = rest[rest.length - 1];
  const waypoints = rest.slice(0, -1);

  const params = new URLSearchParams({
    api: "1",
    origin: formatCoord(origin.lat, origin.lng),
    destination: formatCoord(destination.lat, destination.lng),
    travelmode: "driving",
  });

  if (waypoints.length > 0) {
    // Maps URL keeps waypoint order as listed — do not prefix optimize:*
    // (that syntax is for Directions API JSON only; Maps treats it as a place name)
    params.set(
      "waypoints",
      waypoints.map((point) => formatCoord(point.lat, point.lng)).join("|")
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

async function getOsrmDrivingRoute(
  stopPoints: Array<Pick<MapPoint, "lat" | "lng">>
): Promise<[number, number][] | null> {
  if (stopPoints.length < 2) return null;

  const coordinates = stopPoints
    .map((point) => `${point.lng},${point.lat}`)
    .join(";");

  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
      { method: "GET" }
    );
    if (!response.ok) return null;

    const payload = await response.json();
    const route = payload?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(route) || route.length < 2) return null;

    return route.map(
      (pair: [number, number]) => [pair[1], pair[0]] as [number, number]
    );
  } catch {
    return null;
  }
}

function createGoogleMarkerIcon(
  googleMaps: typeof google.maps,
  kind: "stop" | "expense"
): google.maps.Symbol {
  return {
    path: googleMaps.SymbolPath.CIRCLE,
    scale: kind === "expense" ? 14 : 15,
    fillColor: kind === "expense" ? "#dc2626" : "#0f766e",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    labelOrigin: new googleMaps.Point(0, 0),
  };
}

function useMapPoints(stops: TripStop[], expenses: TripExpense[]) {
  const stopPoints = useMemo<MapPoint[]>(
    () =>
      stops.filter(hasCoords).map((stop, index) => ({
        id: `stop-${stop.id}`,
        kind: "stop",
        lat: stop.lat as number,
        lng: stop.lng as number,
        order: index + 1,
        label: `${index + 1}. ${stop.dealerName || stop.location || "Điểm dừng"}`,
        sublabel: `${formatDateDisplay(stop.date)} · ${
          STOP_PURPOSE_LABEL[stop.purpose] || stop.purpose
        }`,
      })),
    [stops]
  );

  const expensePoints = useMemo<MapPoint[]>(
    () =>
      expenses.filter(hasCoords).map((expense) => {
        const category =
          EXPENSE_CATEGORY_LABEL[expense.category] || expense.category;

        return {
          id: `expense-${expense.id}`,
          kind: "expense" as const,
          lat: expense.lat as number,
          lng: expense.lng as number,
          label: `${category} · ${formatCurrency(expense.amount)}`,
          sublabel: formatDateDisplay(expense.date),
        };
      }),
    [expenses]
  );

  const points = useMemo(
    () => [...stopPoints, ...expensePoints],
    [stopPoints, expensePoints]
  );

  return { stopPoints, expensePoints, points };
}

function GoogleTripMap({
  stopPoints,
  expensePoints,
  points,
  containerRef,
  onError,
  onReady,
}: {
  stopPoints: MapPoint[];
  expensePoints: MapPoint[];
  points: MapPoint[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  onError: (message: string) => void;
  onReady: () => void;
}) {
  useEffect(() => {
    if (!containerRef.current || points.length === 0 || !GOOGLE_MAPS_API_KEY) {
      return;
    }

    let cancelled = false;
    const markers: google.maps.Marker[] = [];
    let directionsRenderer: google.maps.DirectionsRenderer | null = null;
    let infoWindow: google.maps.InfoWindow | null = null;

    setOptions({
      key: GOOGLE_MAPS_API_KEY,
      v: "weekly",
    });

    void Promise.all([importLibrary("maps"), importLibrary("routes")])
      .then(async () => {
        if (cancelled || !containerRef.current) return;

        const bounds = new google.maps.LatLngBounds();
        for (const point of points) {
          bounds.extend({ lat: point.lat, lng: point.lng });
        }

        const map = new google.maps.Map(containerRef.current, {
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
        });
        infoWindow = new google.maps.InfoWindow();

        const fitMapToPoints = () => {
          if (points.length === 1) {
            map.setCenter({ lat: points[0].lat, lng: points[0].lng });
            map.setZoom(14);
            return;
          }
          map.fitBounds(bounds, 48);
        };

        for (const point of points) {
          const marker = new google.maps.Marker({
            map,
            position: { lat: point.lat, lng: point.lng },
            icon: createGoogleMarkerIcon(google.maps, point.kind),
            label:
              point.kind === "stop" && point.order
                ? {
                    text: String(point.order),
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: "700",
                  }
                : point.kind === "expense"
                  ? {
                      text: "$",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "700",
                    }
                  : undefined,
            title: [point.label, point.sublabel, ...(point.detailLines ?? [])]
              .filter(Boolean)
              .join(" · "),
          });

          marker.addListener("click", () => {
            infoWindow?.setContent(buildPopupHtml(point));
            infoWindow?.open({ map, anchor: marker });
          });

          markers.push(marker);
        }

        if (stopPoints.length >= 2) {
          directionsRenderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#0f766e",
              strokeWeight: 4,
              strokeOpacity: 0.85,
            },
          });

          const directionsService = new google.maps.DirectionsService();
          const lastStop = stopPoints[stopPoints.length - 1];

          directionsService.route(
            {
              origin: { lat: stopPoints[0].lat, lng: stopPoints[0].lng },
              destination: { lat: lastStop.lat, lng: lastStop.lng },
              waypoints: stopPoints.slice(1, -1).map((point) => ({
                location: { lat: point.lat, lng: point.lng },
                stopover: true,
              })),
              optimizeWaypoints: false,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (cancelled || status !== google.maps.DirectionsStatus.OK || !result) {
                fitMapToPoints();
                if (!cancelled) onReady();
                return;
              }

              directionsRenderer?.setDirections(result);

              const routeBounds = result.routes[0]?.bounds;
              if (routeBounds) {
                const viewBounds = new google.maps.LatLngBounds(
                  routeBounds.getSouthWest(),
                  routeBounds.getNorthEast()
                );
                for (const point of expensePoints) {
                  viewBounds.extend({ lat: point.lat, lng: point.lng });
                }
                map.fitBounds(viewBounds, 48);
              } else {
                fitMapToPoints();
              }

              if (!cancelled) onReady();
            }
          );
        } else {
          fitMapToPoints();
          if (!cancelled) onReady();
        }
      })
      .catch(() => {
        if (!cancelled) {
          onError("Không tải được Google Maps. Kiểm tra API key.");
        }
      });

    return () => {
      cancelled = true;
      for (const marker of markers) {
        marker.setMap(null);
      }
      directionsRenderer?.setMap(null);
      infoWindow?.close();
    };
  }, [containerRef, expensePoints, onError, onReady, points, stopPoints]);

  return null;
}

function LeafletTripMap({
  stopPoints,
  expensePoints,
  points,
  containerRef,
  onReady,
}: {
  stopPoints: MapPoint[];
  expensePoints: MapPoint[];
  points: MapPoint[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  onReady: () => void;
}) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    const latLngs: [number, number][] = [];

    for (const point of stopPoints) {
      const stopIcon = L.divIcon({
        className: "",
        html: `<span style="display:inline-flex;height:30px;width:30px;align-items:center;justify-content:center;border-radius:9999px;background:#0f766e;color:#fff;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${point.order}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      L.marker([point.lat, point.lng], { icon: stopIcon })
        .addTo(map)
        .bindPopup(buildPopupHtml(point));
      latLngs.push([point.lat, point.lng]);
    }

    const expenseIcon = L.divIcon({
      className: "",
      html: `<span style="display:inline-flex;height:28px;width:28px;align-items:center;justify-content:center;border-radius:9999px;background:#dc2626;color:#fff;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">$</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    for (const point of expensePoints) {
      L.marker([point.lat, point.lng], { icon: expenseIcon })
        .addTo(map)
        .bindPopup(buildPopupHtml(point));
      latLngs.push([point.lat, point.lng]);
    }

    let cancelled = false;

    void (async () => {
      const route =
        (await getOsrmDrivingRoute(stopPoints)) ||
        stopPoints.map((point) => [point.lat, point.lng] as [number, number]);

      if (cancelled || !mapRef.current) return;

      if (route.length >= 2) {
        L.polyline(route, {
          color: "#0f766e",
          weight: 4,
          opacity: 0.85,
          lineJoin: "round",
        }).addTo(map);
      }

      if (latLngs.length === 1) {
        map.setView(latLngs[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [36, 36] });
      }

      window.setTimeout(() => {
        map.invalidateSize();
        if (!cancelled) onReady();
      }, 150);
    })();

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, [containerRef, expensePoints, onReady, points, stopPoints]);

  return null;
}

export function TripMap({ stops, expenses, className }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const useGoogleMaps = Boolean(GOOGLE_MAPS_API_KEY);

  const { stopPoints, expensePoints, points } = useMapPoints(stops, expenses);

  const googleMapsUrl = useMemo(() => {
    if (stopPoints.length >= 2) {
      return buildGoogleMapsDirectionsUrl(stopPoints);
    }
    if (stopPoints.length === 1) {
      return buildGoogleMapsPointUrl(stopPoints[0].lat, stopPoints[0].lng);
    }
    if (expensePoints.length > 0) {
      return buildGoogleMapsPointUrl(
        expensePoints[0].lat,
        expensePoints[0].lng
      );
    }
    return null;
  }, [stopPoints, expensePoints]);

  if (points.length === 0) {
    return (
      <EmptyState
        title="Chưa có tọa độ để hiển thị bản đồ"
        description='Dùng “Vị trí hiện tại” khi thêm điểm hoặc ghi chi.'
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          Bản đồ chuyến đi
        </p>
        {googleMapsUrl ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() =>
              window.open(googleMapsUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="h-4 w-4" />
            {stopPoints.length >= 2
              ? "Mở lộ trình trên Google Maps"
              : "Mở trên Google Maps"}
          </Button>
        ) : null}
      </div>

      <div
        ref={containerRef}
        className={cn(
          "z-0 h-64 w-full overflow-hidden rounded-xl border border-[var(--color-border-subtle)] sm:h-80",
          !mapReady && !mapError && "animate-pulse bg-[var(--color-surface-muted)]"
        )}
      />

      {useGoogleMaps ? (
        <GoogleTripMap
          stopPoints={stopPoints}
          expensePoints={expensePoints}
          points={points}
          containerRef={containerRef}
          onError={setMapError}
          onReady={() => {
            setMapError(null);
            setMapReady(true);
          }}
        />
      ) : (
        <LeafletTripMap
          stopPoints={stopPoints}
          expensePoints={expensePoints}
          points={points}
          containerRef={containerRef}
          onReady={() => setMapReady(true)}
        />
      )}

      {mapError ? (
        <p className="mt-2 text-xs text-red-600">{mapError}</p>
      ) : !useGoogleMaps ? (
        <p className="mt-2 text-xs text-[var(--color-text-inverse)]">
          Lộ trình trên bản đồ dùng OpenStreetMap (miễn phí). Có thể hơi khác
          với Google Maps — bấm{" "}
          <strong>Mở lộ trình trên Google Maps</strong> để xem chi tiết.
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-text-inverse)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-700 text-[10px] font-bold text-white">
            1
          </span>
          Điểm dừng theo thứ tự
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
          Chi phí ($)
        </span>
      </div>
    </div>
  );
}
