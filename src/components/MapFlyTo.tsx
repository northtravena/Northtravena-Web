// src/components/MapFlyTo.tsx — Helper component to fly the map to a target location

import { useEffect } from "react";
import { useMap } from "react-leaflet";

interface MapFlyToProps {
  lat: number;
  lng: number;
  zoom?: number;
}

/** Must be a child of <MapContainer>. Flies the map to the given coordinates when they change. */
export function MapFlyTo({ lat, lng, zoom = 13 }: MapFlyToProps) {
  const map = useMap();

  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  }, [map, lat, lng, zoom]);

  return null;
}
