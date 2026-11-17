'use client';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

/** Static-feel location map for detail pages (non-interactive; the address & directions link are the accessible alternative). */
export function MiniMap({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let m: import('leaflet').Map | undefined;
    import('leaflet').then((L) => {
      if (!el.current) return;
      m = L.map(el.current, { center: [lat, lng], zoom: 15, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false, attributionControl: true });
      L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL ?? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(m);
      L.circleMarker([lat, lng], { radius: 10, color: '#fff', weight: 3, fillColor: '#214FA1', fillOpacity: 1 }).addTo(m);
    });
    return () => { m?.remove(); };
  }, [lat, lng]);
  return <div ref={el} className="h-56 w-full bg-mist" role="img" aria-label={`Map showing the location of ${label}`} />;
}
