// src/components/MapSearchBar.tsx — Location search bar using Nominatim (free, no API key)

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, X, Loader2 } from "lucide-react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

interface MapSearchBarProps {
  onSelect: (lat: number, lng: number, label: string) => void;
  className?: string;
}

export function MapSearchBar({ onSelect, className = "" }: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const searchNominatim = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
        { headers: { "Accept": "application/json", "User-Agent": "NorthTravenaAdmin/1.0" } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchNominatim(value), 400);
  }

  function handleSelect(result: NominatimResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    // Use a short version of the display name
    const parts = result.display_name.split(", ");
    const shortLabel = parts.slice(0, 3).join(", ");
    setQuery(shortLabel);
    setOpen(false);
    setResults([]);
    onSelect(lat, lng, shortLabel);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search location on map…"
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
        />
        {loading && <Loader2 className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />}
        {query && !loading && (
          <button onClick={handleClear} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[1100] max-h-60 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.place_id}
              onClick={() => handleSelect(r)}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {r.display_name.split(", ").slice(0, 2).join(", ")}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {r.display_name.split(", ").slice(2, 5).join(", ")}
                </p>
              </div>
            </button>
          ))}
          <p className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">
            Powered by OpenStreetMap Nominatim
          </p>
        </div>
      )}
    </div>
  );
}
