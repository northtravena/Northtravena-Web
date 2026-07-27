// src/components/BookingPinsMap.tsx
// Shows booking pickup/dropoff pins with REAL road routes via OSRM (free, no API key)

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapSearchBar } from "./MapSearchBar";
import { MapFlyTo } from "./MapFlyTo";

// Fix Leaflet icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Teardrop icon factory ────────────────────────────────────────────────────
function makeTeardropIcon(fillColor: string, emoji: string, label?: string, isHighlighted = false) {
  const scale = isHighlighted ? "transform: scale(1.25); z-index: 1000;" : "";
  const borderStyle = isHighlighted ? "border: 2px solid #2563eb; background: #eff6ff; font-weight: 800; color: #1e3a8a;" : "border: 1px solid #d1d5db; background: white; color: #111;";
  return new L.DivIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px; transition: transform 0.2s ease; ${scale}">
      <svg width="30" height="40" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35))">
        <path d="M14 0C8 0 3 4.5 3 10.5c0 7.5 11 22.5 11 22.5s11-15 11-22.5C25 4.5 20 0 14 0z" fill="${fillColor}"/>
        <text x="14" y="17" text-anchor="middle" dominant-baseline="central" font-size="15">${emoji}</text>
      </svg>
      ${label ? `<div style="${borderStyle}border-radius:5px;padding:2px 6px;font-size:10px;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 4px rgba(0,0,0,0.18);">${label}</div>` : ""}
    </div>`,
    className: "booking-pin-marker",
    iconSize: [30, label ? 58 : 40],
    iconAnchor: [15, label ? 56 : 38],
    popupAnchor: [0, label ? -58 : -40],
  });
}

// ─── Status colours ───────────────────────────────────────────────────────────
export function getStatusColor(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s === "canceled" || s === "cancelled") return "#ef4444";
  if (s === "completed" || s === "complete") return "#6b7280";
  if (s === "ongoing" || s === "in_progress") return "#3b82f6";
  if (s === "approved" || s === "accepted") return "#10b981";
  if (s === "pending") return "#f59e0b";
  if (s === "choosing") return "#8b5cf6";
  return "#9ca3af";
}

const STATUS_COLOURS: Record<string, string> = {
  Pending:    "#f59e0b",
  Approved:   "#10b981",
  Ongoing:    "#3b82f6",
  Completed:  "#6b7280",
  Cancelled:  "#ef4444",
  Canceled:   "#ef4444",
  Choosing:   "#8b5cf6",
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BookingPin {
  id: string;
  passengerName?: string;
  captainName?: string;
  status?: string;
  source?: string;
  destination?: string;
  sourceLocation?: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number };
  totalAmount?: number;
  pickupDate?: string;
  pickupTime?: string;
}

interface BookingPinsMapProps {
  bookings: BookingPin[];
  height?: string;
  centerLat?: number;
  centerLng?: number;
  statusFilter?: string;
  singleBookingId?: string | null;
  onClearSingleBooking?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isValidPakCoord(lat: number, lng: number) {
  return lat >= 20 && lat <= 40 && lng >= 60 && lng <= 80;
}

function routeCacheKey(src: { lat: number; lng: number }, dst: { lat: number; lng: number }) {
  return `${src.lat.toFixed(5)},${src.lng.toFixed(5)}-${dst.lat.toFixed(5)},${dst.lng.toFixed(5)}`;
}

// Fetch real road route from OSRM public API (free, no key needed)
async function fetchOsrmRoute(
  src: { lat: number; lng: number },
  dst: { lat: number; lng: number }
): Promise<[number, number][] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${src.lng},${src.lat};${dst.lng},${dst.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const coords: [number, number][] = data?.routes?.[0]?.geometry?.coordinates;
    if (!coords) return null;
    // GeoJSON is [lng, lat] — Leaflet needs [lat, lng]
    return coords.map((pt) => [pt[1], pt[0]]);
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function BookingPinsMap({
  bookings,
  height = "500px",
  centerLat = 35.9208,
  centerLng = 74.3145,
  statusFilter = "all",
  singleBookingId = null,
  onClearSingleBooking,
}: BookingPinsMapProps) {
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>(statusFilter || "all");
  const [hoveredBookingId, setHoveredBookingId] = useState<string | null>(null);
  // Map from cacheKey => route polyline points (or null = straight-line fallback)
  const [routes, setRoutes] = useState<Record<string, [number, number][] | null>>({});
  const [routeLoading, setRouteLoading] = useState(false);

  const singleBooking = singleBookingId
    ? bookings.find((b) => String(b.id) === String(singleBookingId) || String((b as any)._id) === String(singleBookingId))
    : null;

  useEffect(() => {
    if (statusFilter) setActiveFilter(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    if (singleBooking) {
      const src = singleBooking.sourceLocation;
      if (src && isValidPakCoord(src.lat, src.lng)) {
        setFlyTo({ lat: src.lat, lng: src.lng, zoom: 15 });
      }
    }
  }, [singleBookingId, singleBooking]);

  useEffect(() => {
    if (flyTo) {
      const t = setTimeout(() => setFlyTo(null), 500);
      return () => clearTimeout(t);
    }
  }, [flyTo]);

  // Fetch OSRM routes for all visible bookings that have both src+dst
  const fetchRoutes = useCallback(async (toFetch: BookingPin[]) => {
    const needed = toFetch.filter((b) => {
      const src = b.sourceLocation;
      const dst = b.destinationLocation;
      if (!src || !dst) return false;
      if (!isValidPakCoord(src.lat, src.lng) || !isValidPakCoord(dst.lat, dst.lng)) return false;
      const key = routeCacheKey(src, dst);
      return !(key in routes); // skip already fetched
    });
    if (needed.length === 0) return;

    setRouteLoading(true);
    const fetched: Record<string, [number, number][] | null> = {};
    // Fetch with a small delay between requests to be polite to OSRM
    for (const b of needed) {
      const src = b.sourceLocation!;
      const dst = b.destinationLocation!;
      const key = routeCacheKey(src, dst);
      fetched[key] = await fetchOsrmRoute(src, dst);
      await new Promise((r) => setTimeout(r, 150)); // 150ms between requests
    }
    setRoutes((prev) => ({ ...prev, ...fetched }));
    setRouteLoading(false);
  }, [routes]);

  const filtered = bookings.filter((b) => {
    if (singleBookingId) {
      return String(b.id) === String(singleBookingId) || String((b as any)._id) === String(singleBookingId);
    }
    if (activeFilter !== "all") {
      const bs = (b.status || "").toLowerCase();
      const af = activeFilter.toLowerCase();
      if (af === "pending" && bs !== "pending") return false;
      if (af === "approved" && bs !== "approved" && bs !== "accepted") return false;
      if (af === "ongoing" && bs !== "ongoing" && bs !== "in_progress") return false;
      if (af === "completed" && bs !== "completed" && bs !== "complete") return false;
      if (af === "cancelled" && bs !== "cancelled" && bs !== "canceled") return false;
      if (af !== "pending" && af !== "approved" && af !== "ongoing" && af !== "completed" && af !== "cancelled" && bs !== af) return false;
    }
    const hasSrc = b.sourceLocation && isValidPakCoord(b.sourceLocation.lat, b.sourceLocation.lng);
    const hasDst = b.destinationLocation && isValidPakCoord(b.destinationLocation.lat, b.destinationLocation.lng);
    return hasSrc || hasDst;
  });

  useEffect(() => {
    fetchRoutes(filtered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, activeFilter, singleBookingId]);

  const statusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
    const s = b.status || "Unknown";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const filterOptions = [
    { key: "all", label: "All", count: bookings.length, color: "#374151" },
    { key: "Pending", label: "Pending", count: statusCounts["Pending"] || 0, color: "#f59e0b" },
    { key: "Approved", label: "Approved", count: statusCounts["Approved"] || 0, color: "#10b981" },
    { key: "Ongoing", label: "Ongoing", count: statusCounts["Ongoing"] || 0, color: "#3b82f6" },
    { key: "Completed", label: "Completed", count: statusCounts["Completed"] || 0, color: "#6b7280" },
    { key: "Cancelled", label: "Cancelled", count: statusCounts["Cancelled"] || 0, color: "#ef4444" },
  ];

  return (
    <div style={{ height }} className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Search Bar Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-80 max-w-[90%] pointer-events-auto">
        <MapSearchBar onSelect={(lat, lng) => setFlyTo({ lat, lng, zoom: 14 })} />
      </div>

      {/* Single Ride Focused Top-Left Floating Banner */}
      {singleBookingId && (
        <div className="absolute top-4 left-4 z-[1000] bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>
              Single Ride Focused:{" "}
              <strong className="text-emerald-300">
                {singleBooking?.passengerName || "Booking #" + String(singleBookingId).slice(-4)}
              </strong>
            </span>
          </div>
          {onClearSingleBooking && (
            <button
              onClick={onClearSingleBooking}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold text-white transition-all cursor-pointer border border-white/20"
            >
              Show All Rides ✕
            </button>
          )}
        </div>
      )}

      {/* Route loading badge */}
      {routeLoading && (
        <div className="absolute top-3 left-4 z-[1000] bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow flex items-center gap-1.5">
          <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
          Loading road routes…
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-3 space-y-1.5 text-xs">
        <p className="font-bold text-gray-700 mb-1">Booking Map</p>
        <div className="flex items-center gap-2">
          <div style={{ width: 14, height: 14, background: "#10b981", borderRadius: "50%", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          <span className="text-gray-600">Pickup location</span>
        </div>
        <div className="flex items-center gap-2">
          <div style={{ width: 14, height: 14, background: "#ef4444", borderRadius: "50%", border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          <span className="text-gray-600">Dropoff location</span>
        </div>
        <div className="border-t border-gray-100 pt-1.5 mt-1 space-y-0.5">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: STATUS_COLOURS[status] ?? "#9ca3af" }} />
                <span className="text-gray-600">{status}</span>
              </div>
              <span className="font-bold text-gray-800">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Visible rides count badge (Top-Right) */}
      <div className="absolute top-3 right-4 z-[1000] bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md border border-gray-200 text-xs font-semibold text-gray-700 pointer-events-auto">
        Showing {filtered.length} of {bookings.length} rides
      </div>

      <MapContainer center={[centerLat, centerLng]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {flyTo && <MapFlyTo lat={flyTo.lat} lng={flyTo.lng} zoom={flyTo.zoom} />}

        {filtered.map((booking, idx) => {
          const rideNum = idx + 1;
          const isHovered = hoveredBookingId === booking.id;
          const anyHovered = hoveredBookingId !== null;

          // Micro coordinate offset for overlapping pins so stacked markers sit side-by-side
          const offsetLat = (idx % 3 - 1) * 0.00015;
          const offsetLng = (Math.floor(idx / 3) % 3 - 1) * 0.00015;

          const rawSrc = booking.sourceLocation;
          const rawDst = booking.destinationLocation;

          const src = rawSrc && isValidPakCoord(rawSrc.lat, rawSrc.lng)
            ? { lat: rawSrc.lat + offsetLat, lng: rawSrc.lng + offsetLng }
            : null;
          const dst = rawDst && isValidPakCoord(rawDst.lat, rawDst.lng)
            ? { lat: rawDst.lat + offsetLat, lng: rawDst.lng + offsetLng }
            : null;

          const statusColor = getStatusColor(booking.status);
          const shortName = booking.passengerName?.split(" ")[0] || "Passenger";
          const hasBoth = src && dst;
          const cacheKey = rawSrc && rawDst && isValidPakCoord(rawSrc.lat, rawSrc.lng) && isValidPakCoord(rawDst.lat, rawDst.lng)
            ? routeCacheKey(rawSrc, rawDst)
            : "";
          const roadRoute = cacheKey ? routes[cacheKey] : undefined;

          // Polyline styles based on hover state
          const polylineWeight = isHovered ? 9 : 5;
          const polylineOpacity = isHovered ? 1 : anyHovered ? 0.15 : 0.85;

          const pickupIcon = makeTeardropIcon(
            "#10b981",
            "🟢",
            `#${rideNum} ${shortName}`,
            isHovered
          );
          const dropoffIcon = makeTeardropIcon(
            "#ef4444",
            "🔴",
            `#${rideNum} Dropoff`,
            isHovered
          );

          return (
            <span key={booking.id}>
              {/* Road route (from OSRM) or straight-line fallback */}
              {hasBoth && (
                roadRoute ? (
                  // Real road polyline — thick with outline for Google Maps feel
                  <>
                    <Polyline
                      positions={roadRoute}
                      pathOptions={{ color: "white", weight: polylineWeight + 3, opacity: polylineOpacity }}
                    />
                    <Polyline
                      positions={roadRoute}
                      pathOptions={{ color: statusColor, weight: polylineWeight, opacity: polylineOpacity }}
                      eventHandlers={{
                        mouseover: () => setHoveredBookingId(booking.id),
                        mouseout: () => setHoveredBookingId(null),
                      }}
                    >
                      <Tooltip sticky>
                        <span className="text-xs font-bold">
                          #{rideNum} {booking.passengerName}: {booking.source || "Pickup"} → {booking.destination || "Destination"}
                        </span>
                      </Tooltip>
                    </Polyline>
                  </>
                ) : roadRoute === null ? (
                  // OSRM failed — fallback to dashed straight line
                  <Polyline
                    positions={[[src!.lat, src!.lng], [dst!.lat, dst!.lng]]}
                    pathOptions={{ color: statusColor, weight: isHovered ? 5 : 2, opacity: polylineOpacity, dashArray: "6, 5" }}
                    eventHandlers={{
                      mouseover: () => setHoveredBookingId(booking.id),
                      mouseout: () => setHoveredBookingId(null),
                    }}
                  />
                ) : null // still loading
              )}

              {/* Pickup marker */}
              {src && (
                <Marker
                  position={[src.lat, src.lng]}
                  icon={pickupIcon}
                  eventHandlers={{
                    mouseover: () => setHoveredBookingId(booking.id),
                    mouseout: () => setHoveredBookingId(null),
                  }}
                >
                  <Popup>
                    <div className="p-1 min-w-[210px] space-y-1.5">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="font-bold text-sm text-gray-900">#{rideNum} {booking.passengerName || "Passenger"}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white" style={{ background: statusColor }}>{booking.status}</span>
                      </div>
                      <p className="text-xs font-semibold text-emerald-700">🟢 Pickup Location</p>
                      <p className="text-xs text-gray-600">{booking.source || "Unknown"}</p>
                      {booking.destination && <p className="text-xs text-gray-500">→ {booking.destination}</p>}
                      {booking.pickupDate && <p className="text-xs text-gray-400">{booking.pickupDate} {booking.pickupTime || ""}</p>}
                      {booking.totalAmount !== undefined && <p className="text-xs font-bold text-gray-800 pt-0.5">PKR {booking.totalAmount.toLocaleString()}</p>}
                      {booking.captainName && <p className="text-xs text-indigo-600">🚗 {booking.captainName}</p>}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Dropoff marker */}
              {dst && (
                <Marker
                  position={[dst.lat, dst.lng]}
                  icon={dropoffIcon}
                  eventHandlers={{
                    mouseover: () => setHoveredBookingId(booking.id),
                    mouseout: () => setHoveredBookingId(null),
                  }}
                >
                  <Popup>
                    <div className="p-1 min-w-[210px] space-y-1.5">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="font-bold text-sm text-gray-900">#{rideNum} {booking.passengerName || "Passenger"}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white" style={{ background: statusColor }}>{booking.status}</span>
                      </div>
                      <p className="text-xs font-semibold text-red-600">🔴 Dropoff Destination</p>
                      <p className="text-xs text-gray-600">{booking.destination || "Unknown"}</p>
                      {booking.source && <p className="text-xs text-gray-500">From: {booking.source}</p>}
                    </div>
                  </Popup>
                </Marker>
              )}
            </span>
          );
        })}
      </MapContainer>
    </div>
  );
}
