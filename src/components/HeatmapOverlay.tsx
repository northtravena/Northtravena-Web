// src/components/HeatmapOverlay.tsx — Leaflet heatmap layer using leaflet.heat

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

// Type augmentation for leaflet.heat (no @types available)
declare module "leaflet" {
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
      pane?: string;
    }
  ): L.Layer;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity?: number;
}

interface HeatmapOverlayProps {
  points: HeatmapPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
  max?: number;
  minOpacity?: number;
  gradient?: Record<number, string>;
}

/**
 * Renders a heatmap layer directly on the Leaflet map.
 * Must be a child of <MapContainer>.
 */
export function HeatmapOverlay({
  points,
  radius = 30,
  blur = 25,
  maxZoom = 13,
  max = 1.0,
  minOpacity = 0.4,
  gradient = {
    0.0: "#3b82f6",  // blue  — low density
    0.3: "#10b981",  // green
    0.5: "#f59e0b",  // amber
    0.7: "#f97316",  // orange
    1.0: "#ef4444",  // red   — high density
  },
}: HeatmapOverlayProps) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (points.length === 0) return;

    // Remove previous layer if it exists
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const latlngs: Array<[number, number, number]> = points.map((p) => [
      p.lat,
      p.lng,
      p.intensity ?? 1.0,
    ]);

    const heatLayer = L.heatLayer(latlngs, {
      radius,
      blur,
      maxZoom,
      max,
      minOpacity,
      gradient,
    });

    heatLayer.addTo(map);
    layerRef.current = heatLayer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, radius, blur, maxZoom, max, minOpacity, gradient]);

  return null;
}

/**
 * Convert an array of passenger locations to heatmap points.
 * Each passenger residence and workplace contributes a point.
 * Unmatched passengers get higher intensity (0.8) to highlight underserved areas.
 */
export function passengerLocationsToHeatmap(
  passengers: Array<{
    residence?: { coordinates?: [number, number] };
    workplace?: { coordinates?: [number, number] };
    matchStatus: string;
  }>,
  options?: { includeWorkplace?: boolean }
): HeatmapPoint[] {
  const includeWorkplace = options?.includeWorkplace ?? true;
  const points: HeatmapPoint[] = [];

  for (const p of passengers) {
    const intensity = p.matchStatus === "unmatched" ? 0.8 : p.matchStatus === "matched" ? 0.3 : 0.5;

    // Residence point
    if (p.residence?.coordinates) {
      const [lng, lat] = p.residence.coordinates;
      if (lat !== 0 || lng !== 0) {
        points.push({ lat, lng, intensity });
      }
    }

    // Workplace point
    if (includeWorkplace && p.workplace?.coordinates) {
      const [lng, lat] = p.workplace.coordinates;
      if (lat !== 0 || lng !== 0) {
        points.push({ lat, lng, intensity: intensity * 0.7 });
      }
    }
  }

  return points;
}
