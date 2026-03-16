"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { VacantProperty } from "@/lib/types";

interface ResultsMapProps {
  properties: VacantProperty[];
  center: { lat: number; lng: number } | null;
  onPropertySelect: (property: VacantProperty) => void;
}

const CONFIDENCE_COLORS = {
  high: "#dc2626",
  medium: "#f59e0b",
  low: "#22c55e",
};

let mapsInitialized = false;

export default function ResultsMap({
  properties,
  center,
  onPropertySelect,
}: ResultsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current) return;

    const init = async () => {
      try {
        if (!mapsInitialized) {
          setOptions({ key: apiKey, v: "weekly" });
          mapsInitialized = true;
        }

        const { Map } = await importLibrary("maps") as google.maps.MapsLibrary;
        await importLibrary("marker");

        if (!mapRef.current) return;

        const map = new Map(mapRef.current, {
          center: center || { lat: 39.7392, lng: -104.9903 },
          zoom: 12,
          mapId: "vacancy-finder-map",
          mapTypeControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;
        setLoaded(true);
      } catch {
        // Google Maps not available
      }
    };

    init();
  }, [center]);

  useEffect(() => {
    if (!loaded || !mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasValidMarkers = false;

    properties.forEach((prop) => {
      if (!prop.lat || !prop.lng) return;

      const position = { lat: prop.lat, lng: prop.lng };
      bounds.extend(position);
      hasValidMarkers = true;

      const pinEl = document.createElement("div");
      pinEl.style.width = "24px";
      pinEl.style.height = "24px";
      pinEl.style.borderRadius = "50%";
      pinEl.style.backgroundColor = CONFIDENCE_COLORS[prop.confidence];
      pinEl.style.border = "3px solid white";
      pinEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      pinEl.style.cursor = "pointer";

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current!,
        position,
        content: pinEl,
        title: prop.address,
      });

      marker.addListener("click", () => {
        onPropertySelect(prop);
      });

      markersRef.current.push(marker);
    });

    if (hasValidMarkers && markersRef.current.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, 50);
    } else if (center) {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(12);
    }
  }, [properties, loaded, center, onPropertySelect]);

  return (
    <div ref={mapRef} className="w-full h-full min-h-[400px] rounded-lg" />
  );
}
