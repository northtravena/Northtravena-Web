// src/components/LocationPicker.tsx — Interactive map picker for selecting locations
// Uses Leaflet + Nominatim (free, no API key) for reverse/forward geocoding

import { useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Search, MapPin, Navigation, ChevronDown, Crosshair, X, Clock } from "lucide-react";
import { makePinIcon } from "@/lib/leaflet";

const FROM_ICON = makePinIcon("#10b981"); // emerald
const TO_ICON = makePinIcon("#ef4444");   // red

// ─── Types ───────────────────────────────────────────────────────────────────
export interface LocationValue {
  address: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  from: LocationValue;
  to: LocationValue;
  onFromChange: (loc: LocationValue) => void;
  onToChange: (loc: LocationValue) => void;
  height?: string;
  fromLabel?: string;
  toLabel?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
}

// ─── Nominatim helpers ───────────────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

async function forwardGeocode(query: string): Promise<NominatimResult[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    return await res.json();
  } catch {
    return [];
  }
}

// ─── Map click handler ───────────────────────────────────────────────────────
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ─── Fly-to when a search result is selected ─────────────────────────────────
function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }, [lat, lng, zoom, map]);
  return null;
}

// ─── Search bar ──────────────────────────────────────────────────────────────
function SearchBar({ onSelect }: { onSelect: (lat: number, lng: number, label: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await forwardGeocode(value);
      setResults(res);
      setOpen(res.length > 0);
      setSearching(false);
    }, 400);
  };

  const handleSelect = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    onSelect(lat, lng, r.display_name);
    setQuery(r.display_name.length > 50 ? r.display_name.slice(0, 50) + "…" : r.display_name);
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search for a location…"
          className="w-full pl-8 pr-8 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-gray-400"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {searching && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[1000] max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lon}-${i}`}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0 flex items-start gap-2"
            >
              <MapPin className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main LocationPicker component ───────────────────────────────────────────
export function LocationPicker({
  from,
  to,
  onFromChange,
  onToChange,
  height = "320px",
  fromLabel = "Starting Point",
  toLabel = "Destination",
  center = { lat: 35.9208, lng: 74.3145 },
  zoom = 12,
}: LocationPickerProps) {
  const [activePin, setActivePin] = useState<"from" | "to">("from");
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const [throttled, setThrottled] = useState(false);
  const lastClickTime = useRef(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFrom = from.lat !== 0 || from.lng !== 0;
  const hasTo = to.lat !== 0 || to.lng !== 0;

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      // Throttle: Nominatim allows max 1 request/second
      const now = Date.now();
      if (now - lastClickTime.current < 1100) {
        setThrottled(true);
        if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = setTimeout(() => setThrottled(false), 1500);
        return;
      }
      lastClickTime.current = now;
      const address = await reverseGeocode(lat, lng);
      if (activePin === "from") {
        onFromChange({ address, lat, lng });
      } else {
        onToChange({ address, lat, lng });
      }
    },
    [activePin, onFromChange, onToChange]
  );

  const handleSearchSelect = useCallback(
    async (lat: number, lng: number, label: string) => {
      if (activePin === "from") {
        onFromChange({ address: label, lat, lng });
      } else {
        onToChange({ address: label, lat, lng });
      }
      setFlyTarget({ lat, lng, zoom: 15 });
    },
    [activePin, onFromChange, onToChange]
  );

  const clearPin = (which: "from" | "to") => {
    if (which === "from") {
      onFromChange({ address: "", lat: 0, lng: 0 });
    } else {
      onToChange({ address: "", lat: 0, lng: 0 });
    }
  };

  // Line between the two points
  const linePositions: [number, number][] = [];
  if (hasFrom) linePositions.push([from.lat, from.lng]);
  if (hasTo) linePositions.push([to.lat, to.lng]);

  return (
    <div className="space-y-3">
      {/* Pin selector tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActivePin("from")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border-2 ${
            activePin === "from"
              ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm"
              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          {fromLabel}
          {hasFrom && (
            <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-[10px]">
              Set
            </span>
          )}
        </button>
        <button
          onClick={() => setActivePin("to")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border-2 ${
            activePin === "to"
              ? "bg-red-50 border-red-400 text-red-700 shadow-sm"
              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          {toLabel}
          {hasTo && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px]">
              Set
            </span>
          )}
        </button>
      </div>

      {/* Search bar */}
      <SearchBar onSelect={handleSearchSelect} />

      {/* Instruction */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
        <Crosshair className={`w-3.5 h-3.5 shrink-0 ${activePin === "from" ? "text-emerald-500" : "text-red-500"}`} />
        <p className="text-[11px] text-gray-500">
          Click the map to set <span className={`font-semibold ${activePin === "from" ? "text-emerald-600" : "text-red-600"}`}>{activePin === "from" ? fromLabel : toLabel}</span>
          {" · "}
          <span className="text-gray-400">or search above</span>
        </p>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200 relative" style={{ height }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}

          <MapClickHandler onMapClick={handleMapClick} />

          {/* From marker */}
          {hasFrom && (
            <Marker position={[from.lat, from.lng]} icon={FROM_ICON}>
              <Popup>
                <div className="text-xs min-w-[140px]">
                  <p className="font-semibold text-emerald-700">{fromLabel}</p>
                  <p className="text-gray-600 mt-1">{from.address}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* To marker */}
          {hasTo && (
            <Marker position={[to.lat, to.lng]} icon={TO_ICON}>
              <Popup>
                <div className="text-xs min-w-[140px]">
                  <p className="font-semibold text-red-700">{toLabel}</p>
                  <p className="text-gray-600 mt-1">{to.address}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dashed line between the two points */}
          {linePositions.length === 2 && (
            <Polyline
              positions={linePositions}
              pathOptions={{
                color: "#6366f1",
                weight: 2.5,
                opacity: 0.6,
                dashArray: "8, 6",
              }}
            />
          )}
        </MapContainer>

        {/* Active pin indicator overlay */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000]">
          {throttled ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md border bg-amber-50 border-amber-200 text-amber-700 text-[11px] font-medium animate-fade-in-up">
              <Clock className="w-3 h-3" />
              Please wait a moment…
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md border text-[11px] font-medium ${
              activePin === "from"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              <div className={`w-2 h-2 rounded-full ${activePin === "from" ? "bg-emerald-500" : "bg-red-500"}`} />
              Clicking map sets {activePin === "from" ? fromLabel : toLabel}
            </div>
          )}
        </div>
      </div>

      {/* Selected locations summary */}
      <div className="grid grid-cols-2 gap-2">
        {/* From summary */}
        <div className={`rounded-xl p-2.5 border text-xs space-y-1 ${
          hasFrom
            ? "bg-emerald-50 border-emerald-200"
            : "bg-gray-50 border-gray-200 border-dashed"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-emerald-700">{fromLabel}</span>
            </div>
            {hasFrom && (
              <button onClick={() => clearPin("from")} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {hasFrom ? (
            <p className="text-gray-600 line-clamp-2 leading-relaxed">{from.address}</p>
          ) : (
            <p className="text-gray-400 italic">Not set — click map or search</p>
          )}
        </div>

        {/* To summary */}
        <div className={`rounded-xl p-2.5 border text-xs space-y-1 ${
          hasTo
            ? "bg-red-50 border-red-200"
            : "bg-gray-50 border-gray-200 border-dashed"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-semibold text-red-700">{toLabel}</span>
            </div>
            {hasTo && (
              <button onClick={() => clearPin("to")} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {hasTo ? (
            <p className="text-gray-600 line-clamp-2 leading-relaxed">{to.address}</p>
          ) : (
            <p className="text-gray-400 italic">Not set — click map or search</p>
          )}
        </div>
      </div>
    </div>
  );
}
