/**
 * Signal #13: FCC Broadband Disconnection
 *
 * Uses the FCC Broadband Map API to check if broadband service
 * is available/active at a commercial address. A commercial address
 * with no active broadband providers is a vacancy signal.
 */
import type { VacancySignal } from "./types";

export async function checkBroadbandStatus(
  address: string,
  city: string,
  state: string,
  lat?: number | null,
  lng?: number | null
): Promise<VacancySignal | null> {
  try {
    // FCC Broadband Map API - check broadband availability
    const locationId = await getLocationId(address, city, state);
    if (!locationId && lat != null && lng != null) {
      // Try coordinate-based lookup
      return checkBroadbandByCoords(lat, lng, address);
    }
    if (!locationId) return null;

    const res = await fetch(
      `https://broadbandmap.fcc.gov/api/public/map/listAvailabilities?location_id=${locationId}&technology_code=0`
    );

    if (!res.ok) return null;
    const data = await res.json();

    const providers = data?.data || [];

    if (providers.length === 0) {
      return {
        type: "broadband_dark",
        source: "FCC Broadband Map",
        description: "No broadband providers service this address — potential indicator of vacancy or abandonment.",
        score: 55,
        raw_data: { location_id: locationId, provider_count: 0 },
        detected_at: new Date().toISOString(),
        evidence_url: `https://broadbandmap.fcc.gov/location-summary/fixed?location_id=${locationId}`,
      };
    }

    // Commercial properties typically need broadband; few providers = concern
    if (providers.length <= 1) {
      return {
        type: "broadband_dark",
        source: "FCC Broadband Map",
        description: `Only ${providers.length} broadband provider at this address — below typical for commercial property.`,
        score: 25,
        raw_data: { location_id: locationId, provider_count: providers.length },
        detected_at: new Date().toISOString(),
      };
    }

    return {
      type: "broadband_dark",
      source: "FCC Broadband Map",
      description: `${providers.length} broadband providers service this address — normal connectivity.`,
      score: 5,
      raw_data: { location_id: locationId, provider_count: providers.length },
      detected_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Broadband check failed:", err);
    return null;
  }
}

async function getLocationId(
  address: string,
  city: string,
  state: string
): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${address}, ${city}, ${state}`);
    const res = await fetch(
      `https://broadbandmap.fcc.gov/api/public/map/listAddresses?query=${query}&maxResults=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.location_id || null;
  } catch {
    return null;
  }
}

async function checkBroadbandByCoords(
  lat: number,
  lng: number,
  address: string
): Promise<VacancySignal | null> {
  try {
    const res = await fetch(
      `https://broadbandmap.fcc.gov/api/public/map/listAvailabilitiesByLatLng?latitude=${lat}&longitude=${lng}&technology_code=0`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const providers = data?.data || [];

    if (providers.length === 0) {
      return {
        type: "broadband_dark",
        source: "FCC Broadband Map",
        description: `No broadband providers found near ${address}.`,
        score: 50,
        raw_data: { provider_count: 0, lat, lng },
        detected_at: new Date().toISOString(),
      };
    }

    return {
      type: "broadband_dark",
      source: "FCC Broadband Map",
      description: `${providers.length} broadband provider(s) near this location.`,
      score: providers.length <= 1 ? 20 : 5,
      raw_data: { provider_count: providers.length, lat, lng },
      detected_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
