type MapsDestination = {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
};

function hasCoords(dest: MapsDestination) {
  return (
    typeof dest.lat === "number" &&
    Number.isFinite(dest.lat) &&
    typeof dest.lng === "number" &&
    Number.isFinite(dest.lng)
  );
}

export function placeMapsDestination(place: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
}): MapsDestination | null {
  const address = String(place.address || "").trim();
  if (hasCoords(place)) {
    return { lat: place.lat, lng: place.lng, address: address || null };
  }
  if (address) return { address };
  return null;
}

export function orderMapsDestination(order: {
  shippingAddress?: string | null;
  dealerLat?: number | null;
  dealerLng?: number | null;
  dealerAddress?: string | null;
}): MapsDestination | null {
  return placeMapsDestination({
    lat: order.dealerLat,
    lng: order.dealerLng,
    address: order.shippingAddress || order.dealerAddress,
  });
}

/** Chỉ đường từ vị trí hiện tại (Maps tự lấy GPS) tới điểm giao. */
export function googleMapsDirectionsUrl(dest: MapsDestination) {
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
  });
  if (hasCoords(dest)) {
    params.set("destination", `${dest.lat},${dest.lng}`);
  } else if (dest.address?.trim()) {
    params.set("destination", dest.address.trim());
  } else {
    return "";
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function openGoogleMapsDirections(dest: MapsDestination) {
  const url = googleMapsDirectionsUrl(dest);
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}
