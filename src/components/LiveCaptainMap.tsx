// src/components/LiveCaptainMap.tsx — Real-time captain & passenger tracking map (Phase 4)

import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "@/lib/api";
import type { Captain, PassengerLocation } from "@/types/api";
import { Car, MapPin, Users, UserCheck, Flame, User } from "lucide-react";
import { MapSearchBar } from "./MapSearchBar";
import { MapFlyTo } from "./MapFlyTo";
import { HeatmapOverlay, passengerLocationsToHeatmap } from "./HeatmapOverlay";

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
      <div style="
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

const CAPTAIN_ICONS: Record<string, L.DivIcon> = {
  active:   makeCaptainIcon("#10b981", carSvg),
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

const CAPTAIN_ICONS_SM: Record<string, L.DivIcon> = {
  active:   makeCaptainIcon("#10b981", carSvg, 24),
  pending:  makeCaptainIcon("#f59e0b", carSvg, 24),
  inactive: makeCaptainIcon("#9ca3af", carSvg, 24),
  rejected: makeCaptainIcon("#ef4444", carSvg, 24),
};

const CAPTAIN_ICONS_SM_LIVE: Record<string, L.DivIcon> = {
  active:   makeCaptainIcon("#10b981", carSvg, 24, "live-captain-pulse"),
  pending:  makeCaptainIcon("#f59e0b", carSvg, 24, "live-captain-pulse"),
  inactive: makeCaptainIcon("#9ca3af", carSvg, 24, "live-captain-pulse"),
  rejected: makeCaptainIcon("#ef4444", carSvg, 24, "live-captain-pulse"),
};

// ─── Passenger marker icons ──────────────────────────────────────────────────
const personSvg = `<circle cx="12" cy="7" r="4"/><path d="M5.5 21c0-3.9 2.9-7 6.5-7s6.5 3.1 6.5 7"/>`;

function makePassengerSvgIcon(color: string, svgInner: string, size = 26) {
  return new L.DivIcon({
    html: `
      <div style="
        background: ${color};
        width: ${size}px; height: ${size}px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2.5px solid white;
      ">
        <svg width="${size * 0.52}" height="${size * 0.52}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${svgInner}
        </svg>
      </div>
    `,
    className: "passenger-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makePassengerEmojiIcon(color: string, emoji: string, size = 26) {
  return new L.DivIcon({
    html: `
      <div style="
        background: ${color};
        width: ${size}px; height: ${size}px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2.5px solid white;
      ">
        <span style="font-size: ${size * 0.55}px; line-height: 1;">${emoji}</span>
      </div>
    `,
    className: "passenger-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const PASSENGER_ICONS = {
  home: {
    matched:   makePassengerSvgIcon("#10b981", personSvg),
    unmatched: makePassengerSvgIcon("#f59e0b", personSvg),
    "on-hold": makePassengerSvgIcon("#6b7280", personSvg),
  },
  workplace: {
    matched:   makePassengerEmojiIcon("#10b981", "🏢"),
    unmatched: makePassengerEmojiIcon("#f59e0b", "🏢"),
    "on-hold": makePassengerEmojiIcon("#6b7280", "🏢"),
  },
};

// ─── Route endpoint icons (teardrop pins) ──────────────────────────────────
function makeTeardropIcon(fillColor: string, emoji: string) {
  return new L.DivIcon({
    html: `<svg width="28" height="36" viewBox="0 0 28 36" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
      <path d="M14 0C8 0 3 4.5 3 10.5c0 7.5 11 22.5 11 22.5s11-15 11-22.5C25 4.5 20 0 14 0z" fill="${fillColor}"/>
      <text x="14" y="18" text-anchor="middle" dominant-baseline="central" font-size="16">${emoji}</text>
    </svg>`,
    className: "route-endpoint-marker",
    iconSize: [28, 36],
    iconAnchor: [14, 34],
  });
}

const captainFromCarIcon = makeTeardropIcon("#10b981", "🚗");
const captainFromVanIcon = makeTeardropIcon("#10b981", "🚐");
const captainToIcon = makeTeardropIcon("#ef4444", "🏢");

// ─── Status color map ────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  active:   "#10b981",
  pending:  "#f59e0b",
  inactive: "#9ca3af",
  rejected: "#ef4444",
};

// ─── Props ───────────────────────────────────────────────────────────────────
export interface LiveCaptainMapProps {
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  height?: string;
  vehicleTypeFilter?: "all" | "car" | "van" | "other";
  /** Filter captains by status (default: "all") */
  captainStatusFilter?: "all" | "active" | "pending" | "inactive" | "rejected";  // Keep in sync with CaptainStatusFilter in MapControls
  /** Show captain markers and routes (default: true) */
  showCaptains?: boolean;
  /** Show passenger residence/workplace markers (default: true) */
  showPassengers?: boolean;
  /** Show route polylines from→to (default: true) */
  showRoutes?: boolean;
  /** Show passenger↔captain connection lines (default: true) */
  showConnections?: boolean;
  /** Show the search radius circle (default: true) */
  showRadiusCircle?: boolean;
  /** Disable map panning (for embedded contexts) */
  centerLocked?: boolean;
  /** Compact legend (fewer details) */
  compactLegend?: boolean;
  /** Show the search bar overlay (default: true) */
  showSearch?: boolean;
  /** Enable marker clustering (default: true) */
  enableClustering?: boolean;
  /** Show passenger density heatmap overlay (default: false) */
  showHeatmap?: boolean;
  /** Filter passengers by match status (default: "all") */
  matchStatusFilter?: "all" | "matched" | "unmatched" | "on-hold";  // Keep in sync with MatchStatusFilter in MapControls
  /** Callback when a captain marker is clicked */
  onCaptainClick?: (captain: Captain) => void;
  /** Callback when admin wants to assign a passenger to a captain from the map */
  onAssignPassenger?: (captain: Captain) => void;
}

export function LiveCaptainMap({
  centerLat = 35.9208,
  centerLng = 74.3145,
  radiusKm = 50,
  height = "400px",
  vehicleTypeFilter = "all",
  captainStatusFilter = "all",
  showCaptains = true,
  showPassengers = true,
  showRoutes = true,
  showConnections = true,
  showRadiusCircle = true,
  centerLocked = false,
  compactLegend = false,
  showSearch = true,
  enableClustering = false,
  showHeatmap = false,
  matchStatusFilter = "all",
  onCaptainClick,
  onAssignPassenger,
}: LiveCaptainMapProps) {
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [passengers, setPassengers] = useState<PassengerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [heatmapEnabled, setHeatmapEnabled] = useState(showHeatmap);

  // Sync external prop changes
  useEffect(() => {
    setHeatmapEnabled(showHeatmap);
  }, [showHeatmap]);

  const fetchCaptains = useCallback(async () => {
    try {
      const fetches: Promise<unknown>[] = [];
      if (showCaptains) {
        fetches.push(
          api.get<Captain[]>(
            `/captains/nearby?lat=${centerLat}&lng=${centerLng}&radiusKm=${radiusKm}`
          )
        );
      }
      if (showPassengers) {
        fetches.push(
          api.get<PassengerLocation[]>("/admin/passengers/all-locations").catch(() => [])
        );
      }

      const results = await Promise.all(fetches);
      let ci = 0;
      if (showCaptains) setCaptains(results[ci++] as Captain[]);
      if (showPassengers) setPassengers((results[ci] as PassengerLocation[]) ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load map data");
    } finally {
      setLoading(false);
    }
  }, [centerLat, centerLng, radiusKm, showCaptains, showPassengers]);

  useEffect(() => {
    setLoading(true);
    fetchCaptains();
    const interval = setInterval(fetchCaptains, 10_000);
    return () => clearInterval(interval);
  }, [fetchCaptains]);

  // Filter captains by vehicle type and status
  const filteredCaptains = useMemo(() => {
    let result = captains;
    if (vehicleTypeFilter && vehicleTypeFilter !== "all") {
      result = result.filter((c) => c.vehicleType === vehicleTypeFilter);
    }
    if (captainStatusFilter !== "all") {
      result = result.filter((c) => c.status === captainStatusFilter);
    }
    return result;
  }, [captains, vehicleTypeFilter, captainStatusFilter]);

  // Build a lookup: captainId → captain for connection lines
  const captainMap = new Map(filteredCaptains.map((c) => [c._id, c]));

  // Filter passengers by match status and assigned captain status
  const filteredPassengers = useMemo(() => {
    let result = passengers;
    if (matchStatusFilter !== "all") {
      result = result.filter((p) => p.matchStatus === matchStatusFilter);
    }
    if (captainStatusFilter !== "all") {
      result = result.filter((p) => {
        // Use embedded captain status from populated assignedCaptain
        if (typeof p.assignedCaptain === "object" && p.assignedCaptain?.status) {
          return p.assignedCaptain.status === captainStatusFilter;
        }
        // If no embedded status, exclude unmatched passengers
        return false;
      });
    }
    return result;
  }, [passengers, matchStatusFilter, captainStatusFilter]);

  // Heatmap data points (memoized to avoid re-creating heat layer every render)
  const heatmapPoints = useMemo(() => passengerLocationsToHeatmap(filteredPassengers), [filteredPassengers]);

  if (error) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center p-6">
          <p className="text-red-700 font-medium">Failed to load map</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={fetchCaptains}
            className="mt-3 text-xs text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Counts for the badge (always show totals regardless of filter)
  const matchedCount = passengers.filter((p) => p.matchStatus === "matched").length;
  const unmatchedCount = passengers.filter((p) => p.matchStatus === "unmatched").length;
  const onHoldCount = passengers.filter((p) => p.matchStatus === "on-hold").length;

  // Unmatched passengers for the click-to-assign panel (use filtered set)
  const unmatchedPassengers = filteredPassengers.filter((p) => p.matchStatus === "unmatched");

  // Cluster config (only used when clustering is enabled)
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

  // Legend vertical offset depends on how many overlays are at the top
  const legendTop = showSearch && !centerLocked ? "top-16" : "top-4";

  return (
    <div className="relative" style={{ height }}>
      {/* Live updating badge */}
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white px-3 py-1.5 rounded-lg shadow-md border border-gray-200 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-gray-700">Updating…</span>
        </div>
      )}

      {/* Search bar overlay */}
      {showSearch && !centerLocked && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-80 max-w-[90%]">
          <MapSearchBar
            onSelect={(lat, lng) => setFlyTarget({ lat, lng, zoom: 14 })}
          />
        </div>
      )}

      {/* Heatmap toggle button */}
      {showPassengers && (
        <div className={`absolute right-4 z-[1000] ${legendTop}`}>
          <div className="flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 p-1">
            <button
              onClick={() => setHeatmapEnabled(!heatmapEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                heatmapEnabled
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="Toggle passenger density heatmap"
            >
              <Flame className="w-3.5 h-3.5" />
              Heatmap
            </button>
          </div>
        </div>
      )}

      {/* Legend badge */}
      {compactLegend ? (
        <div className={`absolute left-4 z-[999] bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200 ${legendTop}`}>
          <div className="flex items-center gap-3 text-xs">
            {showCaptains && (
              <span className="flex items-center gap-1">
                <Car className="w-3 h-3 text-emerald-600" />
                <span className="font-semibold">{filteredCaptains.length}</span>
              </span>
            )}
            {showPassengers && passengers.length > 0 && (
              <>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-emerald-500" />
                  <span>{matchedCount}</span>
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-amber-500" />
                  <span>{unmatchedCount}</span>
                </span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`absolute left-4 z-[999] bg-white px-3 py-2 rounded-lg shadow-md border border-gray-200 space-y-1 ${legendTop}`}
        >
          {showCaptains && (
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-gray-900">
                {filteredCaptains.length} Captain{filteredCaptains.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {showPassengers && passengers.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                {matchedCount} Matched
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <User className="w-3.5 h-3.5 text-amber-500" />
                {unmatchedCount} Unmatched
              </div>
              {onHoldCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {onHoldCount} On Hold
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400 pt-1 border-t border-gray-100">
                <span className="inline-block w-4 border-t-2 border-dashed border-emerald-500" />
                <span>Matched</span>
                <span className="inline-block w-4 border-t-2 border-dashed border-amber-500" />
                <span>Unmatched</span>
                <span className="inline-block w-4 border-t-2 border-dashed border-gray-400" />
                <span>On Hold</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 pt-1 border-t border-gray-100">
                <span className="inline-flex items-center gap-1">
                  🚗
                  <span>From</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  🏢
                  <span>To</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  🏢
                  <span>Work</span>
                </span>
              </div>
            </>
          )}
          {heatmapEnabled && (
            <div className="flex items-center gap-2 text-xs text-gray-600 pt-1 border-t border-gray-100">
              <Flame className="w-3 h-3 text-orange-500" />
              Density heatmap
            </div>
          )}
        </div>
      )}

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={11}
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
        className="z-0"
        dragging={!centerLocked}
        zoomControl={!centerLocked}
        scrollWheelZoom={!centerLocked}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fly-to when search result is selected */}
        {flyTarget && <MapFlyTo lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}

        {/* Search radius circle */}
        {showRadiusCircle && (
          <Circle
            center={[centerLat, centerLng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: "#10b981",
              fillColor: "#10b981",
              fillOpacity: 0.06,
              weight: 2,
              dashArray: "6, 4",
            }}
          />
        )}

        {/* Heatmap overlay */}
        {heatmapEnabled && heatmapPoints.length > 0 && (
          <HeatmapOverlay points={heatmapPoints} />
        )}

        {/* ── Shared map body content ── */}
        {(() => {
          const bodyContent = (
            <>
              {/* ── Captain route lines (From → To) ── */}
              {showCaptains && showRoutes && filteredCaptains.map((captain) => {
                const fromCoords = captain.routeFrom?.coordinates;
                const toCoords = captain.routeTo?.coordinates;
                if (!fromCoords || !toCoords) return null;
                const [fLng, fLat] = fromCoords;
                const [tLng, tLat] = toCoords;
                if ((fLat === 0 && fLng === 0) || (tLat === 0 && tLng === 0)) return null;

                const lineColor = STATUS_COLORS[captain.status] ?? "#10b981";

                return (
                  <Polyline
                    key={`route-${captain._id}`}
                    positions={[[fLat, fLng], [tLat, tLng]]}
                    pathOptions={{
                      color: lineColor,
                      weight: 3,
                      opacity: 0.5,
                      dashArray: "8, 6",
                    }}
                  >
                    <Tooltip permanent={false} direction="top">
                      <span className="text-xs">{captain.fullName}: {captain.routeFrom.address} → {captain.routeTo.address}</span>
                    </Tooltip>
                  </Polyline>
                );
              })}

              {/* ── Route endpoint markers ── */}
              {showCaptains && showRoutes && filteredCaptains.map((captain) => {
                const fromCoords = captain.routeFrom?.coordinates;
                const toCoords = captain.routeTo?.coordinates;
                if (!fromCoords || !toCoords) return null;
                const [fLng, fLat] = fromCoords;
                const [tLng, tLat] = toCoords;
                if ((fLat === 0 && fLng === 0) && (tLat === 0 && tLng === 0)) return null;

                return (
                  <span key={`endpoints-${captain._id}`}>
                    {!(fLat === 0 && fLng === 0) && (
                      <Marker position={[fLat, fLng]} icon={captain.vehicleType === "van" ? captainFromVanIcon : captainFromCarIcon}>
                        <Popup><span className="text-xs font-medium"><strong style={{color:'#059669'}}>🚗 From:</strong> {captain.routeFrom.address}<br/><span className="text-gray-500">{captain.fullName}</span></span></Popup>
                      </Marker>
                    )}
                    {!(tLat === 0 && tLng === 0) && (
                      <Marker position={[tLat, tLng]} icon={captainToIcon}>
                        <Popup><span className="text-xs font-medium"><strong style={{color:'#dc2626'}}>🏢 To:</strong> {captain.routeTo.address}<br/><span className="text-gray-500">{captain.fullName}</span></span></Popup>
                      </Marker>
                    )}
                  </span>
                );
              })}

              {/* ── Passenger-captain connection lines ── */}
              {showPassengers && showConnections && filteredPassengers
                .filter((p) => {
                  if (p.matchStatus !== "matched") return false;
                  const captainId = typeof p.assignedCaptain === "object" ? p.assignedCaptain?._id : p.assignedCaptain;
                  return captainId && captainMap.has(captainId);
                })
                .map((p) => {
                  const resCoords = p.residence?.coordinates;
                  if (!resCoords || (resCoords[1] === 0 && resCoords[0] === 0)) return null;
                  const [rLng, rLat] = resCoords;

                  const captainId = typeof p.assignedCaptain === "object" ? p.assignedCaptain?._id : null;
                  const captain = captainId ? captainMap.get(captainId) : null;
                  if (!captain?.routeFrom?.coordinates) return null;
                  const [cLng, cLat] = captain.routeFrom.coordinates;
                  if (cLat === 0 && cLng === 0) return null;

                  return (
                    <Polyline
                      key={`conn-${p._id}`}
                      positions={[[rLat, rLng], [cLat, cLng]]}
                      pathOptions={{
                        color: "#6366f1",
                        weight: 1.5,
                        opacity: 0.35,
                        dashArray: "4, 4",
                      }}
                    />
                  );
                })}

              {/* ── Passenger home ↔ work connection lines ── */}
              {showPassengers && filteredPassengers.map((p) => {
                const resCoords = p.residence?.coordinates;
                const wpCoords = p.workplace?.coordinates;
                const hasRes = resCoords && !(resCoords[1] === 0 && resCoords[0] === 0);
                const hasWp = wpCoords && !(wpCoords[1] === 0 && wpCoords[0] === 0);
                if (!hasRes || !hasWp) return null;

                const lineColor =
                  p.matchStatus === "matched" ? "#10b981" :
                  p.matchStatus === "unmatched" ? "#f59e0b" : "#9ca39a";

                const captainName = typeof p.assignedCaptain === "object" ? p.assignedCaptain?.fullName : null;

                return (
                  <Polyline
                    key={`hw-${p._id}`}
                    positions={[[resCoords![1], resCoords![0]], [wpCoords![1], wpCoords![0]]]}
                    pathOptions={{
                      color: lineColor,
                      weight: 1.5,
                      opacity: 0.4,
                      dashArray: "6, 4",
                    }}
                  >
                    {p.matchStatus === "matched" && captainName && (
                      <Tooltip permanent={false} direction="center">
                        <span className="text-xs">🚗 {captainName}</span>
                      </Tooltip>
                    )}
                  </Polyline>
                );
              })}

              {/* ── Passenger markers (residence 🏠 + workplace 🏢) ── */}
              {showPassengers && filteredPassengers.map((p) => {
                const resCoords = p.residence?.coordinates;
                const wpCoords = p.workplace?.coordinates;
                const hasRes = resCoords && !(resCoords[1] === 0 && resCoords[0] === 0);
                const hasWp = wpCoords && !(wpCoords[1] === 0 && wpCoords[0] === 0);
                const passengerName = p.userId?.fullName ?? "Passenger";

                return (
                  <span key={`passenger-${p._id}`}>
                    {hasRes && (
                      <Marker
                        position={[resCoords![1], resCoords![0]]}
                        icon={PASSENGER_ICONS.home[p.matchStatus]}
                      >
                        <Popup>
                          <div className="text-xs min-w-[160px]">
                            <p className="font-semibold text-gray-900">{passengerName}</p>
                            <p className="flex items-center gap-1 mt-1">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21c0-3.9 2.9-7 6.5-7s6.5 3.1 6.5 7"/></svg>
                              <span className="text-gray-600">{p.residence.address}</span>
                            </p>
                            <p className={`mt-1 font-medium capitalize ${
                              p.matchStatus === "matched" ? "text-emerald-600" :
                              p.matchStatus === "unmatched" ? "text-amber-600" : "text-gray-500"
                            }`}>
                              ● {p.matchStatus}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                    {hasWp && (
                      <Marker
                        position={[wpCoords![1], wpCoords![0]]}
                        icon={PASSENGER_ICONS.workplace[p.matchStatus]}
                      >
                        <Popup>
                          <div className="text-xs min-w-[160px]">
                            <p className="font-semibold text-gray-900">{passengerName}</p>
                            <p className="flex items-center gap-1 mt-1">
                              <span>🏢</span>
                              <span className="text-gray-600">{p.workplace.address}</span>
                            </p>
                            <p className={`mt-1 font-medium capitalize ${
                              p.matchStatus === "matched" ? "text-emerald-600" :
                              p.matchStatus === "unmatched" ? "text-amber-600" : "text-gray-500"
                            }`}>
                              ● {p.matchStatus}
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </span>
                );
              })}

              {/* ── Captain markers (status-colored, with click-to-assign) ── */}
              {showCaptains && filteredCaptains.map((captain) => {
                const liveLng = captain.currentLocation?.coordinates?.[0];
                const liveLat = captain.currentLocation?.coordinates?.[1];
                const hasLive = liveLng != null && liveLat != null && !(liveLng === 0 && liveLat === 0);

                const lng = hasLive ? liveLng! : captain.routeFrom?.coordinates?.[0];
                const lat = hasLive ? liveLat! : captain.routeFrom?.coordinates?.[1];

                if (lat == null || lng == null || (lat === 0 && lng === 0)) return null;

                const icons = hasLive
                  ? (compactLegend ? CAPTAIN_ICONS_SM_LIVE : CAPTAIN_ICONS_LIVE)
                  : (compactLegend ? CAPTAIN_ICONS_SM : CAPTAIN_ICONS);
                const icon = icons[captain.status] ?? icons.active;
                const statusColor = STATUS_COLORS[captain.status] ?? "#10b981";

                // Count assigned passengers
                const assignedCount = filteredPassengers.filter(
                    (p) => p.matchStatus === "matched" && (
                    typeof p.assignedCaptain === "object"
                      ? p.assignedCaptain?._id === captain._id
                      : p.assignedCaptain === captain._id
                  )
                ).length;

                return (
                  <Marker
                    key={captain._id}
                    position={[lat, lng]}
                    icon={icon}
                    eventHandlers={
                      onCaptainClick || onAssignPassenger
                        ? {
                            click: () => {
                              if (onCaptainClick) onCaptainClick(captain);
                            },
                          }
                        : undefined
                    }
                  >
                    <Popup>
                      <div className="p-1 min-w-[220px]">
                        <h3 className="font-semibold text-gray-900 mb-2">{captain.fullName}</h3>
                        <div className="space-y-1 text-xs text-gray-600">
                          <p className="flex items-center gap-1">
                            <Car className="w-3 h-3 shrink-0" />
                            {captain.vehicleType} — {captain.vehicleModel}
                          </p>
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {captain.routeFrom?.address} → {captain.routeTo?.address}
                          </p>
                          {captain.phone && (
                            <p className="text-gray-500">{captain.phone}</p>
                          )}
                          <p className="font-medium mt-1 capitalize" style={{ color: statusColor }}>
                            ● {captain.status}
                            {hasLive && <span className="ml-1 text-gray-400 font-normal">(live)</span>}
                          </p>
                          {assignedCount > 0 && (
                            <p className="text-emerald-600 font-medium">
                              <Users className="w-3 h-3 inline mr-1" />
                              {assignedCount} passenger{assignedCount !== 1 ? "s" : ""} assigned
                            </p>
                          )}
                        </div>

                        {/* Click-to-assign button */}
                        {onAssignPassenger && captain.status === "active" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAssignPassenger(captain);
                            }}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {unmatchedPassengers.length > 0
                              ? `Assign ${unmatchedPassengers.length} unmatched passenger${unmatchedPassengers.length !== 1 ? "s" : ""}`
                              : "No unmatched passengers"
                            }
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
