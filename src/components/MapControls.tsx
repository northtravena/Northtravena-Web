// src/components/MapControls.tsx — Location presets and radius selector for the live map

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Car, Layers, Users, UserCheck } from "lucide-react";

export type VehicleTypeFilter = "all" | "car" | "van" | "other";
export type MatchStatusFilter = "all" | "Pending" | "Approved" | "Ongoing" | "Completed" | "Cancelled";

const RIDE_STATUSES: { value: MatchStatusFilter; label: string; color: string }[] = [
  { value: "all", label: "All Rides", color: "" },
  { value: "Ongoing", label: "Ongoing", color: "text-blue-600 font-semibold" },
  { value: "Completed", label: "Completed", color: "text-gray-500 font-semibold" },
  { value: "Pending", label: "Pending", color: "text-amber-600 font-semibold" },
  { value: "Approved", label: "Approved", color: "text-emerald-600 font-semibold" },
  { value: "Cancelled", label: "Cancelled", color: "text-red-500 font-semibold" },
];
export type CaptainStatusFilter = "all" | "active" | "live" | "offline" | "pending" | "inactive" | "rejected";

interface MapControlsProps {
  onLocationChange: (lat: number, lng: number, radius: number) => void;
  matchStatusFilter?: MatchStatusFilter;
  onMatchStatusChange?: (status: MatchStatusFilter) => void;
  captainStatusFilter?: CaptainStatusFilter;
  onCaptainStatusChange?: (status: CaptainStatusFilter) => void;
  clusteringEnabled?: boolean;
  onClusteringToggle?: (enabled: boolean) => void;
}

const PRESET_LOCATIONS = [
  { name: "Gilgit", lat: 35.9208, lng: 74.3145 },
  { name: "Hunza", lat: 36.3167, lng: 74.6500 },
  { name: "Lahore", lat: 31.5204, lng: 74.3587 },
  { name: "Islamabad", lat: 33.6844, lng: 73.0479 },
  { name: "Karachi", lat: 24.8607, lng: 67.0011 },
];

const CAPTAIN_STATUSES: { value: CaptainStatusFilter; label: string; color: string }[] = [
  { value: "all", label: "All Captains", color: "" },
  { value: "active", label: "Approved", color: "text-emerald-600" },
  { value: "live", label: "🟢 Live Now", color: "text-emerald-700" },
  { value: "offline", label: "⚪ Offline", color: "text-gray-500" },
  { value: "pending", label: "Pending", color: "text-amber-600" },
  { value: "rejected", label: "Rejected", color: "text-red-500" },
];

export function MapControls({ onLocationChange, matchStatusFilter = "all", onMatchStatusChange, captainStatusFilter = "all", onCaptainStatusChange, clusteringEnabled = false, onClusteringToggle }: MapControlsProps) {
  const [radius, setRadius] = useState(50);
  const [active, setActive] = useState("Gilgit");

  function handleLocation(name: string, lat: number, lng: number) {
    setActive(name);
    onLocationChange(lat, lng, radius);
  }

  function handleRadius(newRadius: number) {
    setRadius(newRadius);
    const loc = PRESET_LOCATIONS.find((l) => l.name === active) ?? PRESET_LOCATIONS[0];
    onLocationChange(loc.lat, loc.lng, newRadius);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-1.5 mr-1">
        <MapPin className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-600">Jump to:</span>
      </div>

      {PRESET_LOCATIONS.map((loc) => (
        <Button
          key={loc.name}
          variant={active === loc.name ? "default" : "outline"}
          size="sm"
          onClick={() => handleLocation(loc.name, loc.lat, loc.lng)}
          className="h-7 text-xs"
        >
          {loc.name}
        </Button>
      ))}

      {/* Captain status filter */}
      {onCaptainStatusChange && (
        <div className="flex items-center gap-1.5 ml-2">
          <UserCheck className="w-3.5 h-3.5 text-gray-400" />
          {CAPTAIN_STATUSES.map((cs) => (
            <Button
              key={cs.value}
              variant={captainStatusFilter === cs.value ? "default" : "outline"}
              size="sm"
              onClick={() => onCaptainStatusChange(cs.value)}
              className={`h-7 text-xs ${captainStatusFilter === cs.value && cs.value !== "all" ? cs.color : ""}`}
            >
              {cs.label}
            </Button>
          ))}
        </div>
      )}

      {/* Ride status filter for Bookings map */}
      {onMatchStatusChange && (
        <div className="flex items-center gap-1.5 ml-2">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          {RIDE_STATUSES.map((rs) => (
            <Button
              key={rs.value}
              variant={matchStatusFilter === rs.value ? "default" : "outline"}
              size="sm"
              onClick={() => onMatchStatusChange(rs.value)}
              className={`h-7 text-xs ${matchStatusFilter === rs.value && rs.value !== "all" ? rs.color : ""}`}
            >
              {rs.label}
            </Button>
          ))}
        </div>
      )}

      {/* Clustering toggle */}
      {onClusteringToggle && (
        <div className="flex items-center gap-1.5 ml-2">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          <button
            onClick={() => onClusteringToggle(!clusteringEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              clusteringEnabled
                ? "bg-indigo-500 text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100 border border-gray-200"
            }`}
            title="Toggle marker clustering"
          >
            Cluster
          </button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <label className="text-xs text-gray-500 font-medium">Radius:</label>
        <select
          value={radius}
          onChange={(e) => handleRadius(Number(e.target.value))}
          className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value={10}>10 km</option>
          <option value={25}>25 km</option>
          <option value={50}>50 km</option>
          <option value={100}>100 km</option>
        </select>
      </div>
    </div>
  );
}
