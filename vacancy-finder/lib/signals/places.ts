/**
 * Signal #2: Google Places "Closed" Detection
 *
 * Uses Google Places API to check business_status for
 * CLOSED_PERMANENTLY or CLOSED_TEMPORARILY at the property address.
 * Also checks if there are ANY active businesses at the address.
 */
import type { VacancySignal } from "./types";

interface PlaceResult {
  place_id: string;
  name: string;
  business_status?: string;
  types?: string[];
  opening_hours?: { open_now: boolean };
}

export async function checkGooglePlaces(
  lat: number,
  lng: number,
  address: string
): Promise<VacancySignal | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    // Nearby search for businesses at this location (50m radius)
    const nearbyRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50&type=establishment&key=${apiKey}`
    );
    if (!nearbyRes.ok) return null;
    const nearbyData = await nearbyRes.json();

    const results: PlaceResult[] = nearbyData.results || [];

    // Also try text search with the address
    const textRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const textData = textRes.ok ? await textRes.json() : { results: [] };
    const textResults: PlaceResult[] = textData.results || [];

    // Combine and deduplicate by place_id
    const allPlaces = new Map<string, PlaceResult>();
    for (const p of [...results, ...textResults]) {
      if (p.place_id && !allPlaces.has(p.place_id)) {
        allPlaces.set(p.place_id, p);
      }
    }

    const places = Array.from(allPlaces.values());

    // Analyze business statuses
    const closed = places.filter(
      (p) =>
        p.business_status === "CLOSED_PERMANENTLY" ||
        p.business_status === "CLOSED_TEMPORARILY"
    );
    const permanentlyClosed = places.filter(
      (p) => p.business_status === "CLOSED_PERMANENTLY"
    );
    const operational = places.filter(
      (p) => p.business_status === "OPERATIONAL"
    );

    if (permanentlyClosed.length > 0) {
      const names = permanentlyClosed.map((p) => p.name).join(", ");
      return {
        type: "google_places",
        source: "Google Places API",
        description: `Permanently closed: ${names}`,
        score: 85,
        raw_data: { closed, operational, total: places.length },
        detected_at: new Date().toISOString(),
      };
    }

    if (closed.length > 0 && operational.length === 0) {
      const names = closed.map((p) => p.name).join(", ");
      return {
        type: "google_places",
        source: "Google Places API",
        description: `Closed business(es): ${names}. No operational businesses found at address.`,
        score: 75,
        raw_data: { closed, operational, total: places.length },
        detected_at: new Date().toISOString(),
      };
    }

    if (places.length === 0) {
      return {
        type: "google_places",
        source: "Google Places API",
        description: "No businesses found at this address on Google Maps.",
        score: 60,
        raw_data: { total: 0 },
        detected_at: new Date().toISOString(),
      };
    }

    if (operational.length > 0) {
      return {
        type: "google_places",
        source: "Google Places API",
        description: `${operational.length} active business(es) found: ${operational.map((p) => p.name).slice(0, 3).join(", ")}`,
        score: 10,
        raw_data: { operational, total: places.length },
        detected_at: new Date().toISOString(),
      };
    }

    return null;
  } catch (err) {
    console.error("Google Places check failed:", err);
    return null;
  }
}
