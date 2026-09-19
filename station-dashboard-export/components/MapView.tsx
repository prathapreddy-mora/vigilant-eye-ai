import { useEffect, useRef } from "react";

type Marker = { lat: number; lng: number; label?: string; tone?: "alert" | "ok" | "default" };

export function MapView({ markers, center, zoom = 5, height = 320, trail }: {
  markers: Marker[]; center?: [number, number]; zoom?: number; height?: number; trail?: { lat: number; lng: number }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !ref.current) return;
      if (!mapRef.current) {
        mapRef.current = L.map(ref.current, { zoomControl: true, attributionControl: false })
          .setView(center ?? [17.385, 78.486], zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current);
        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }
      layerRef.current?.clearLayers();
      const bounds = L.latLngBounds([]);
      
      // Draw polyline trail if provided
      if (trail && trail.length > 1) {
        const latlngs = trail.map(t => [t.lat, t.lng] as [number, number]);
        L.polyline(latlngs, { color: "#22d3ee", weight: 3, opacity: 0.7, dashArray: "5, 5" }).addTo(layerRef.current!);
        trail.forEach(t => bounds.extend([t.lat, t.lng]));
      }

      markers.forEach((m) => {
        const color = m.tone === "alert" ? "#ef4444" : m.tone === "ok" ? "#22c55e" : "#22d3ee";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};box-shadow:0 0 0 4px ${color}33,0 0 12px ${color};border:2px solid #0b1220"></div>`,
          iconSize: [14, 14], iconAnchor: [7, 7],
        });
        const mk = L.marker([m.lat, m.lng], { icon }).addTo(layerRef.current!);
        if (m.label) mk.bindPopup(m.label);
        bounds.extend([m.lat, m.lng]);
      });
      if (markers.length > 1 || (trail && trail.length > 0)) mapRef.current.fitBounds(bounds.pad(0.2));
      else if (markers.length === 1) mapRef.current.setView([markers[0].lat, markers[0].lng], 12);
    })();
    return () => { cancelled = true; };
  }, [markers, center, zoom, trail]);

  useEffect(() => () => {
    mapRef.current?.remove(); mapRef.current = null;
  }, []);

  return <div ref={ref} style={{ height, width: "100%" }} className="rounded-lg overflow-hidden border border-border" />;
}
