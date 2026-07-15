// src/lib/leaflet.ts — Shared Leaflet utilities

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's broken default icon paths when bundled with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export function makePinIcon(color: string) {
  return new L.DivIcon({
    html: `<div style="position:relative;width:28px;height:36px;"><svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${color}"/><circle cx="14" cy="13" r="6" fill="white" opacity="0.9"/></svg></div>`,
    className: "location-picker-marker",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

export function makeSmallPinIcon(color: string) {
  return new L.DivIcon({
    html: `<div style="position:relative;width:24px;height:32px;"><svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill="${color}"/><circle cx="12" cy="11" r="5" fill="white" opacity="0.9"/></svg></div>`,
    className: "location-picker-marker",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  });
}
