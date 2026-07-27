// src/components/LiveCaptainMap.tsx — Real-time Firebase captain tracking map

import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "@/lib/api";
import type { Captain } from "@/types/api";
import { Car, MapPin, Phone, Star, CheckCircle, Clock } from "lucide-react";
import { MapSearchBar } from "./MapSearchBar";
import { MapFlyTo } from "./MapFlyTo";

// Fix Leaflet's broken default icon paths when bundled with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Captain marker icons by status ──────────────────────────────────────────
const carSvg = `<path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path><polygon points="12 15 17 21 7 21 12 15"></polygon>`;

function makeCaptainIcon(color: string, svgInner: string, size = 32, extraClass = "") {
  return new L.DivIcon({
    html: `
      <div class="captain-marker-inner" style="
        background: ${color};
        width: ${size}px; height: ${size}px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 3px solid white;
      ">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          ${svgInner}
        </svg>
      </div>
    `,
    className: `captain-marker${extraClass ? " " + extraClass : ""}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const CAPTAIN_ICONS_OFFLINE: Record<string, L.DivIcon> = {
  active:   makeCaptainIcon("#6b7280", carSvg), // Gray for offline approved captains
  pending:  makeCaptainIcon("#f59e0b", carSvg),
  inactive: makeCaptainIcon("#9ca3af", carSvg),
  rejected: makeCaptainIcon("#ef4444", carSvg),
};

const CAPTAIN_ICONS_LIVE: Record<string, L.DivIcon> = {
  active:   makeCaptainIcon("#10b981", carSvg, 32, "live-captain-pulse"),
  pending:  makeCaptainIcon("#f59e0b", carSvg, 32, "live-captain-pulse"),
  inactive: makeCaptainIcon("#9ca3af", carSvg, 32, "live-captain-pulse"),
  rejected: makeCaptainIcon("#ef4444", carSvg, 32, "live-captain-pulse"),
};



// ─── Teardrop icon factory for active ride pickup/dropoff ───────────────────
function makeTeardropIcon(fillColor: string, emoji: string, label?: string) {
  return new L.DivIcon({
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <svg width="28" height="36" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
        <path d="M14 0C8 0 3 4.5 3 10.5c0 7.5 11 22.5 11 22.5s11-15 11-22.5C25 4.5 20 0 14 0z" fill="${fillColor}"/>
        <text x="14" y="18" text-anchor="middle" dominant-baseline="central" font-size="15">${emoji}</text>
      </svg>
      ${label ? `<div style="background:white;border:1px solid #e5e7eb;border-radius:4px;padding:1px 5px;font-size:10px;font-weight:700;white-space:nowrap;max-width:100px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 3px rgba(0,0,0,0.15)">${label}</div>` : ""}
    </div>`,
    className: "active-ride-pin-marker",
    iconSize: [28, label ? 54 : 36],
    iconAnchor: [14, label ? 52 : 34],
    popupAnchor: [0, label ? -54 : -36],
  });
}

function resolveCaptainStatus(c: any): "active" | "pending" | "inactive" | "rejected" {
  const s = String(c.status || "").toLowerCase();
  const acc = String(c.accountStatus || "").toLowerCase();
  if (s === "active" || acc === "active" || c.approved === true) return "active";
  if (s === "rejected" || acc === "rejected") return "rejected";
  if (s === "inactive" || acc === "inactive") return "inactive";
  return "pending";
}

const STATUS_COLORS: Record<string, string> = {
  active:   "#10b981",
  pending:  "#f59e0b",
  inactive: "#9ca3af",
  rejected: "#ef4444",
};

// ─── Helper: Validate Regional Coordinates ────────────────────────────────────
function isValidCoordinate(lat: number, lng: number): boolean {
  if (!lat || !lng || (lat === 0 && lng === 0)) return false;
  // Regional boundary validation for Pakistan / Gilgit-Baltistan (lat 20°-40° N, lng 60°-80° E)
  return lat >= 20 && lat <= 40 && lng >= 60 && lng <= 80;
}

function routeCacheKey(src: { lat: number; lng: number }, dst: { lat: number; lng: number }) {
  return `${src.lat.toFixed(4)},${src.lng.toFixed(4)}->${dst.lat.toFixed(4)},${dst.lng.toFixed(4)}`;
}

// ─── Helper: Parse & Format Timestamp ───────────────────────────────────────
function parseTimestamp(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;
  if (typeof ts === "object") {
    if (typeof ts.toDate === "function") return ts.toDate();
    if (typeof ts._seconds === "number") return new Date(ts._seconds * 1000);
    if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000);
  }
  if (typeof ts === "string" || typeof ts === "number") {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatLastSeen(c: any): { isRecent: boolean; text: string } {
  // Use the most recently updated timestamp available.
  // lastPingAt = written when GPS is broadcasting (most accurate)
  // updatedAt  = written on any document update (broader signal)
  const date = parseTimestamp(c.lastPingAt)
    || parseTimestamp(c.updatedAt)
    || parseTimestamp(c.lastPing)
    || parseTimestamp(c.lastActiveAt);
  if (!date) return { isRecent: false, text: "No recent GPS ping" };

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // "Live" = GPS ping received within the last 5 minutes
  const isRecent = diffMins >= 0 && diffMins < 5;

  if (diffMins < 1) return { isRecent, text: "Active just now" };
  if (diffMins < 60) return { isRecent, text: `Active ${diffMins} min${diffMins > 1 ? "s" : ""} ago` };
  if (diffHours < 24) return { isRecent, text: `Last seen ${diffHours} hr${diffHours > 1 ? "s" : ""} ago` };
  return { isRecent, text: `Last seen ${diffDays} day${diffDays > 1 ? "s" : ""} ago` };
}

// ─── Helper: Parse GPS Coordinates for a Captain ────────────────────────────
function getCaptainCoordinates(c: Captain): { lat: number; lng: number; isLive: boolean; address: string; lastSeenText: string } | null {
  const lastSeen = formatLastSeen(c);

  // 1. Direct Firestore location object: { lat: 35.915, lng: 74.356 } or { latitude, longitude }
  const loc = (c as any).location;
  if (loc && typeof loc === "object") {
    const lat = typeof loc.lat === "number" ? loc.lat : typeof loc.latitude === "number" ? loc.latitude : null;
    const lng = typeof loc.lng === "number" ? loc.lng : typeof loc.longitude === "number" ? loc.longitude : null;
    if (lat !== null && lng !== null && isValidCoordinate(lat, lng)) {
      return {
        lat,
        lng,
        isLive: lastSeen.isRecent,
        address: (c as any).address || (c as any).locationData?.address || c.routeFrom?.address || "Last Location",
        lastSeenText: lastSeen.text,
      };
    }
  }

  // 2. Firestore locationData object: { latitude, longitude, address }
  const locData = (c as any).locationData;
  if (locData && typeof locData.latitude === "number" && typeof locData.longitude === "number" && isValidCoordinate(locData.latitude, locData.longitude)) {
    return {
      lat: locData.latitude,
      lng: locData.longitude,
      isLive: lastSeen.isRecent,
      address: locData.address || (c as any).address || c.routeFrom?.address || "Last Location",
      lastSeenText: lastSeen.text,
    };
  }

  // 3. GeoJSON Point [lng, lat]
  const currLoc = c.currentLocation?.coordinates;
  if (currLoc && Array.isArray(currLoc) && currLoc.length === 2 && isValidCoordinate(currLoc[1], currLoc[0])) {
    return {
      lat: currLoc[1],
      lng: currLoc[0],
      isLive: lastSeen.isRecent,
      address: (c as any).address || c.routeFrom?.address || "Current Location",
      lastSeenText: lastSeen.text,
    };
  }

  // 4. Fallback to routeFrom coordinates [lng, lat]
  const routeFromLoc = c.routeFrom?.coordinates;
  if (routeFromLoc && Array.isArray(routeFromLoc) && routeFromLoc.length === 2 && isValidCoordinate(routeFromLoc[1], routeFromLoc[0])) {
    return {
      lat: routeFromLoc[1],
      lng: routeFromLoc[0],
      isLive: false,
      address: c.routeFrom?.address || "Route Origin",
      lastSeenText: lastSeen.text,
    };
  }

  return null;
}

// ─── Props ───────────────────────────────────────────────────────────────────
export interface LiveCaptainMapProps {
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  height?: string;
  vehicleTypeFilter?: "all" | "car" | "van" | "other";
  captainStatusFilter?: "all" | "active" | "live" | "offline" | "pending" | "inactive" | "rejected";
  showCaptains?: boolean;
  showPassengers?: boolean;
  showRoutes?: boolean;
  showConnections?: boolean;
  showRadiusCircle?: boolean;
  centerLocked?: boolean;
  compactLegend?: boolean;
  showSearch?: boolean;
  enableClustering?: boolean;
  matchStatusFilter?: string;
  captains?: Captain[];
  onCaptainClick?: (captain: Captain) => void;
}

export function LiveCaptainMap({
  centerLat = 35.9208,
  centerLng = 74.3145,
  radiusKm = 50,
  height = "400px",
  vehicleTypeFilter = "all",
  captainStatusFilter = "all",
  showCaptains = true,
  showRoutes = true,
  showRadiusCircle = true,
  centerLocked = false,
  compactLegend = false,
  showSearch = true,
  enableClustering = false,
  captains: externalCaptains,
  onCaptainClick,
}: LiveCaptainMapProps) {
  const [internalCaptains, setInternalCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [routes, setRoutes] = useState<Record<string, [number, number][] | null>>({});
  const [activeBookings, setActiveBookings] = useState<any[]>([]);

  // Fetch real Firebase captains every 5 seconds if not provided by parent
  const fetchCaptains = useCallback(async () => {
    if (externalCaptains && externalCaptains.length > 0) {
      setInternalCaptains(externalCaptains);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<Captain[]>("/firebase/captains");
      setInternalCaptains(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Firebase captain map data");
    } finally {
      setLoading(false);
    }
  }, [externalCaptains]);

  // Fetch active ongoing bookings every 5 seconds to link with live captains
  const fetchActiveBookings = useCallback(async () => {
    try {
      const data = await api.get<any[]>("/firebase/bookings");
      if (Array.isArray(data)) {
        setActiveBookings(data.filter((b) => {
          const s = String(b.status || "").toLowerCase();
          return s === "ongoing" || s === "approved" || s === "accepted" || s === "in_progress";
        }));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCaptains();
    fetchActiveBookings();
    const interval = setInterval(() => {
      fetchCaptains();
      fetchActiveBookings();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchCaptains, fetchActiveBookings]);

  const [internalStatusFilter, setInternalStatusFilter] = useState<string>(captainStatusFilter || "all");

  useEffect(() => {
    if (captainStatusFilter) setInternalStatusFilter(captainStatusFilter);
  }, [captainStatusFilter]);

  const rawCaptains = (externalCaptains && externalCaptains.length > 0) ? externalCaptains : internalCaptains;

  // Filter captains by vehicle type and status
  const filteredCaptains = useMemo(() => {
    let result = rawCaptains;
    if (vehicleTypeFilter && vehicleTypeFilter !== "all") {
      result = result.filter((c) => c.vehicleType === vehicleTypeFilter);
    }
    if (internalStatusFilter !== "all") {
      if (internalStatusFilter === "live") {
        result = result.filter((c) => {
          const loc = getCaptainCoordinates(c);
          return loc && loc.isLive;
        });
      } else if (internalStatusFilter === "offline") {
        result = result.filter((c) => {
          const loc = getCaptainCoordinates(c);
          return !loc || !loc.isLive;
        });
      } else {
        result = result.filter((c) => resolveCaptainStatus(c) === internalStatusFilter);
      }
    }
    return result;
  }, [rawCaptains, vehicleTypeFilter, internalStatusFilter]);

  // Cluster config
  const clusterProps = enableClustering
    ? {
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster: { getChildCount: () => number }) => {
          const count = cluster.getChildCount();
          let size = 40;
          if (count > 10) size = 50;
          if (count > 50) size = 60;
          return new L.DivIcon({
            html: `
              <div style="
                background: #10b981;
                width: ${size}px; height: ${size}px;
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                color: white; font-weight: 700; font-size: 13px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 3px solid white;
              ">${count}</div>
            `,
            className: "marker-cluster-custom",
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      }
    : null;

  const legendTop = showSearch && !centerLocked ? "top-16" : "top-4";

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl flex items-center justify-center p-6" style={{ height }}>
        <div className="text-center">
          <p className="text-red-700 font-bold">Failed to load live map</p>
          <p className="text-red-600 text-xs mt-1">{error}</p>
          <button onClick={fetchCaptains} className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      {/* Search Bar Overlay */}
      {showSearch && !centerLocked && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-80 max-w-[90%] pointer-events-auto">
          <MapSearchBar onSelect={(lat, lng) => setFlyTarget({ lat, lng, zoom: 14 })} />
        </div>
      )}

      {/* Live updating indicator */}
      {loading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-white px-3 py-1.5 rounded-xl shadow-md border border-gray-200 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-gray-700">Syncing Live Captains…</span>
        </div>
      )}

      {/* Legend badge */}
      <div className="absolute bottom-4 left-4 z-[999] bg-white/95 backdrop-blur-sm px-3 py-2 rounded-xl shadow-md border border-gray-200">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-gray-900">
            {filteredCaptains.length} Captain{filteredCaptains.length !== 1 ? "s" : ""} Visible
          </span>
        </div>
      </div>

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={!centerLocked}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {flyTarget && <MapFlyTo lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}

        {/* Search radius circle */}
        {showRadiusCircle && (
          <Circle
            center={[centerLat, centerLng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: "#10b981",
              fillColor: "#10b981",
              fillOpacity: 0.05,
              weight: 2,
              dashArray: "6, 4",
            }}
          />
        )}

        {/* Shared map body content */}
        {(() => {
          const bodyContent = (
            <>
              {/* Render Active Ride Pins & Polylines for Captains with ongoing rides */}
              {showCaptains && showRoutes && filteredCaptains.map((captain) => {
                const cId = captain.id || (captain as any)._id || (captain as any).uid;
                const activeBooking = activeBookings.find((b) => {
                  const bCapId = b.acceptedCaptainId || b.captainId || b.driverId || b._captain?.id || b._captain?.uid;
                  return bCapId && cId && String(bCapId) === String(cId);
                });

                // 1. If captain has an active ongoing booking, render live ride pins and path
                if (activeBooking) {
                  const pLat = activeBooking.sourceLocation?.lat ?? activeBooking.pickupLocation?.lat;
                  const pLng = activeBooking.sourceLocation?.lng ?? activeBooking.pickupLocation?.lng;
                  const dLat = activeBooking.destinationLocation?.lat ?? activeBooking.dropLocation?.lat;
                  const dLng = activeBooking.destinationLocation?.lng ?? activeBooking.dropLocation?.lng;

                  const hasPickup = isValidCoordinate(pLat, pLng);
                  const hasDropoff = isValidCoordinate(dLat, dLng);

                  const captainLoc = getCaptainCoordinates(captain);
                  const cacheKey = captainLoc && hasPickup && hasDropoff
                    ? routeCacheKey({ lat: captainLoc.lat, lng: captainLoc.lng }, { lat: dLat, lng: dLng })
                    : null;
                  const roadPositions = cacheKey && routes[cacheKey]
                    ? routes[cacheKey]!
                    : [
                        ...(captainLoc ? [[captainLoc.lat, captainLoc.lng] as [number, number]] : []),
                        ...(hasPickup ? [[pLat!, pLng!] as [number, number]] : []),
                        ...(hasDropoff ? [[dLat!, dLng!] as [number, number]] : []),
                      ];

                  const pickupIcon = makeTeardropIcon("#10b981", "🟢", activeBooking.userName || "Pickup");
                  const dropoffIcon = makeTeardropIcon("#ef4444", "🔴", "Destination");

                  return (
                    <span key={`active-ride-${cId}`}>
                      {/* Active Ride Polylines */}
                      {roadPositions.length >= 2 && (
                        <>
                          <Polyline positions={roadPositions} pathOptions={{ color: "white", weight: 7, opacity: 0.9 }} />
                          <Polyline positions={roadPositions} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.95 }} />
                        </>
                      )}

                      {/* Pickup Pin */}
                      {hasPickup && (
                        <Marker position={[pLat!, pLng!]} icon={pickupIcon}>
                          <Popup>
                            <div className="p-1 text-xs space-y-1">
                              <p className="font-bold text-emerald-700">🟢 Pickup Point</p>
                              <p className="font-semibold text-gray-800">{activeBooking.userName || "Passenger"}</p>
                              <p className="text-gray-500">{activeBooking.source || activeBooking.sourceLocation?.address || "Pickup address"}</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      {/* Dropoff Pin */}
                      {hasDropoff && (
                        <Marker position={[dLat!, dLng!]} icon={dropoffIcon}>
                          <Popup>
                            <div className="p-1 text-xs space-y-1">
                              <p className="font-bold text-red-700">🔴 Dropoff Destination</p>
                              <p className="text-gray-500">{activeBooking.destination || activeBooking.destinationLocation?.address || "Dropoff address"}</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}
                    </span>
                  );
                }

                // 2. Standard route line if routeFrom & routeTo are set
                const fromCoords = captain.routeFrom?.coordinates;
                const toCoords = captain.routeTo?.coordinates;
                if (!fromCoords || !toCoords) return null;
                const [fLng, fLat] = fromCoords;
                const [tLng, tLat] = toCoords;
                if (!isValidCoordinate(fLat, fLng) || !isValidCoordinate(tLat, tLng)) return null;

                const lineColor = STATUS_COLORS[captain.status] ?? "#10b981";
                const cacheKey = routeCacheKey({ lat: fLat, lng: fLng }, { lat: tLat, lng: tLat });
                const roadPositions = routes[cacheKey] ?? [[fLat, fLng], [tLat, tLng]];

                return (
                  <span key={`route-group-${cId}`}>
                    <Polyline positions={roadPositions} pathOptions={{ color: "white", weight: 6, opacity: 0.85 }} />
                    <Polyline positions={roadPositions} pathOptions={{ color: lineColor, weight: 4, opacity: 0.9 }}>
                      <Tooltip permanent={false} direction="top">
                        <span className="text-xs font-semibold">{captain.fullName}: {captain.routeFrom?.address} → {captain.routeTo?.address}</span>
                      </Tooltip>
                    </Polyline>
                  </span>
                );
              })}

              {/* Live Captain Markers */}
              {showCaptains && filteredCaptains.map((captain) => {
                const loc = getCaptainCoordinates(captain);
                if (!loc) return null;

                const cId = captain.id || (captain as any)._id || (captain as any).uid;
                const activeBooking = activeBookings.find((b) => {
                  const bCapId = b.acceptedCaptainId || b.captainId || b.driverId || b._captain?.id || b._captain?.uid;
                  return bCapId && cId && String(bCapId) === String(cId);
                });

                const resolvedSt = resolveCaptainStatus(captain);
                const icon = loc.isLive
                  ? (CAPTAIN_ICONS_LIVE[resolvedSt] ?? CAPTAIN_ICONS_LIVE.active)
                  : (CAPTAIN_ICONS_OFFLINE[resolvedSt] ?? CAPTAIN_ICONS_OFFLINE.active);
                const statusColor = loc.isLive ? "#10b981" : "#6b7280";

                return (
                  <Marker
                    key={cId}
                    position={[loc.lat, loc.lng]}
                    icon={icon}
                    eventHandlers={
                      onCaptainClick
                        ? {
                            click: () => onCaptainClick(captain),
                          }
                        : undefined
                    }
                  >
                    <Popup>
                      <div className="p-1 min-w-[240px] space-y-2">
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1">
                            {captain.fullName}
                            {(captain.isVerified || (captain as any).verified) && (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 inline" />
                            )}
                          </h3>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: statusColor }}>
                            {captain.status}
                          </span>
                        </div>

                        {/* Active Ride Banner */}
                        {activeBooking && (
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-700 uppercase text-[10px] tracking-wider">🚖 Active Ride</span>
                              <span className="font-bold text-blue-900">Rs. {activeBooking.totalAmount || activeBooking.amount || 0}</span>
                            </div>
                            <p className="font-semibold text-gray-900">{activeBooking.userName || "Passenger"}</p>
                            <p className="text-[11px] text-gray-600 truncate">🟢 {activeBooking.source || activeBooking.sourceLocation?.address || "Pickup"}</p>
                            <p className="text-[11px] text-gray-600 truncate">🔴 {activeBooking.destination || activeBooking.destinationLocation?.address || "Dropoff"}</p>
                          </div>
                        )}

                        <div className="space-y-1 text-xs text-gray-600">
                          <p className="flex items-center gap-1 font-semibold text-gray-800">
                            <Car className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            {captain.vehicleModel || captain.vehicleType}
                            {captain.registrationPlate ? ` · ${captain.registrationPlate}` : ""}
                          </p>
                          <p className="flex items-center gap-1 text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {loc.address}
                          </p>
                          {captain.phone && (
                            <p className="flex items-center gap-1 text-gray-500">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              {captain.phone}
                            </p>
                          )}
                          <p className="flex items-center gap-1 text-gray-500">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className={loc.isLive ? "text-emerald-600 font-bold" : "text-gray-500 font-medium"}>
                              {loc.lastSeenText}
                            </span>
                          </p>
                          <p className="flex items-center gap-1 text-amber-600 font-semibold pt-0.5">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            {(captain.rating || 5.0).toFixed(1)} ({(captain.tripsCount || (captain as any).trips || 0)} trips)
                          </p>
                        </div>

                        {onCaptainClick && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCaptainClick(captain);
                            }}
                            className="mt-2 w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                          >
                            View Full Details →
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </>
          );

          return enableClustering ? (
            <MarkerClusterGroup {...clusterProps!}>{bodyContent}</MarkerClusterGroup>
          ) : bodyContent;
        })()}
      </MapContainer>
    </div>
  );
}
