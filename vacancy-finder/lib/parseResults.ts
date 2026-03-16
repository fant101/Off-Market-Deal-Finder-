import type { VacantProperty } from "./types";

export function parseAIResponse(
  rawText: string,
  strategy: string
): { properties: VacantProperty[]; marketNotes: string } {
  let properties: VacantProperty[] = [];
  let marketNotes = "";

  // Extract JSON from code blocks
  const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (Array.isArray(parsed)) {
        properties = parsed.map((p) => ({
          address: p.address || "",
          city: p.city || "",
          state: p.state || "",
          zip: p.zip || null,
          lat: null,
          lng: null,
          property_type: p.property_type || "Unknown",
          estimated_sf: p.estimated_sf || null,
          vacancy_signal: p.vacancy_signal || "",
          signal_source: p.signal_source || "",
          time_vacant: p.time_vacant || null,
          owner_name: p.owner_name || null,
          owner_type: p.owner_type || null,
          confidence: validateConfidence(p.confidence),
          details: p.details || "",
          strategy,
        }));
      }
    } catch {
      // Try to find any JSON array in the response
      const arrayMatch = rawText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) {
            properties = parsed.map((p) => ({
              address: p.address || "",
              city: p.city || "",
              state: p.state || "",
              zip: p.zip || null,
              lat: null,
              lng: null,
              property_type: p.property_type || "Unknown",
              estimated_sf: p.estimated_sf || null,
              vacancy_signal: p.vacancy_signal || "",
              signal_source: p.signal_source || "",
              time_vacant: p.time_vacant || null,
              owner_name: p.owner_name || null,
              owner_type: p.owner_type || null,
              confidence: validateConfidence(p.confidence),
              details: p.details || "",
              strategy,
            }));
          }
        } catch {
          // Could not parse
        }
      }
    }
  }

  // Extract market notes
  const notesMatch = rawText.match(/MARKET_NOTES:\s*([\s\S]*?)$/);
  if (notesMatch) {
    marketNotes = notesMatch[1].trim();
  }

  // Filter out properties without addresses
  properties = properties.filter((p) => p.address && p.address.length > 5);

  return { properties, marketNotes };
}

function validateConfidence(val: string): "high" | "medium" | "low" {
  if (val === "high" || val === "medium" || val === "low") return val;
  return "low";
}

function normalizeAddress(addr: string): string {
  if (!addr) return "";
  return addr
    .toLowerCase()
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\b(street|st)\b/g, "st")
    .replace(/\b(avenue|ave)\b/g, "ave")
    .replace(/\b(boulevard|blvd)\b/g, "blvd")
    .replace(/\b(drive|dr)\b/g, "dr")
    .replace(/\b(road|rd)\b/g, "rd")
    .replace(/\b(suite|ste)\b/g, "ste")
    .trim();
}

export function deduplicateProperties(
  properties: VacantProperty[]
): VacantProperty[] {
  const seen = new Map<string, VacantProperty>();

  for (const prop of properties) {
    const key = normalizeAddress(`${prop.address} ${prop.city} ${prop.state}`);

    if (seen.has(key)) {
      const existing = seen.get(key)!;
      // Merge: keep highest confidence
      const confRank = { high: 3, medium: 2, low: 1 };
      if (confRank[prop.confidence] > confRank[existing.confidence]) {
        existing.confidence = prop.confidence;
      }
      // Combine signals if different
      if (
        prop.vacancy_signal &&
        !existing.vacancy_signal.includes(prop.vacancy_signal)
      ) {
        existing.vacancy_signal += ` | ${prop.vacancy_signal}`;
      }
      // Combine strategies
      if (!existing.strategy.includes(prop.strategy)) {
        existing.strategy += `, ${prop.strategy}`;
      }
      // Boost confidence for multi-strategy hits
      if (existing.strategy.includes(",") && existing.confidence !== "high") {
        existing.confidence = "high";
      }
    } else {
      seen.set(key, { ...prop });
    }
  }

  return Array.from(seen.values());
}
