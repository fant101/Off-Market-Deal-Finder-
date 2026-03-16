interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address) return null;

  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}`
    );

    if (!res.ok) {
      console.error(`Geocoding HTTP error: ${res.status}`);
      return null;
    }

    const data = await res.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function batchGeocode(
  addresses: string[]
): Promise<Map<string, GeocodeResult>> {
  const results = new Map<string, GeocodeResult>();
  const batchSize = 10;

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    const promises = batch.map(async (addr) => {
      if (typeof addr !== "string" || !addr.trim()) return;
      const result = await geocodeAddress(addr);
      if (result) {
        results.set(addr, result);
      }
    });
    await Promise.allSettled(promises);
  }

  return results;
}

export function getStreetViewUrl(
  lat: number,
  lng: number,
  width = 400,
  height = 200
): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  return `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${lat},${lng}&key=${apiKey}`;
}
