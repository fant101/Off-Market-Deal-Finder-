/**
 * Signal #5: Building Permit Gap Analysis
 *
 * Searches municipal building permit databases for a lack of recent
 * permit activity. No permits filed in 2+ years on a commercial
 * property is a strong vacancy signal.
 */
import type { VacancySignal } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

// Known open data portals for Colorado cities
const PERMIT_DATA_SOURCES: Record<string, string> = {
  Denver: "Denver Open Data Portal (denvergov.org/opendata) building permits dataset",
  Aurora: "Aurora GIS open data or city building department records",
  "Colorado Springs": "Colorado Springs building permits (coloradosprings.gov)",
  Boulder: "Boulder Open Data (bouldercolorado.gov/open-data)",
  "Fort Collins": "Fort Collins Open Data (fcgov.com/opendata)",
  Lakewood: "Lakewood building permits (lakewood.org)",
  Thornton: "Thornton building permits (thorntonco.gov)",
  Westminster: "Westminster building department records",
  Arvada: "Arvada building permits (arvada.org)",
  Longmont: "Longmont building permits (longmontcolorado.gov)",
};

export async function checkPermitGap(
  address: string,
  city: string,
  state: string
): Promise<VacancySignal | null> {
  const dataSource =
    PERMIT_DATA_SOURCES[city] || `${city} building permit records`;

  try {
    const systemPrompt = `You are a building permit research analyst. Search municipal building permit databases and public records to find permit activity for a specific commercial property.

Look for:
1. Most recent building permit filed
2. Any active or expired permits
3. Certificate of occupancy status
4. Demolition permits
5. Stalled construction (permits pulled but not finaled)

Respond in JSON only:
{"found": true/false, "last_permit_date": "YYYY-MM-DD or null", "years_since_permit": number or null, "permit_count_5yr": number, "stalled_construction": true/false, "demo_permit": true/false, "details": "one paragraph summary", "source_url": "url or null"}`;

    const userPrompt = `Search ${dataSource} and other public records for building permit activity at:

Address: ${address}
City: ${city}
State: ${state}

Look for recent permits, expired permits, stalled construction, and certificate of occupancy issues. Report what you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.found) return null;

    let score = 10;
    if (data.years_since_permit != null) {
      if (data.years_since_permit >= 5) score = 80;
      else if (data.years_since_permit >= 3) score = 65;
      else if (data.years_since_permit >= 2) score = 50;
      else score = 20;
    }
    if (data.permit_count_5yr === 0) score = Math.max(score, 70);
    if (data.stalled_construction) score = Math.max(score, 75);
    if (data.demo_permit) score = Math.max(score, 85);

    score = Math.min(100, score);

    return {
      type: "permit_gap",
      source: dataSource,
      description: data.details || "Permit gap analysis completed",
      score,
      raw_data: data,
      detected_at: new Date().toISOString(),
      evidence_url: data.source_url || undefined,
    };
  } catch (err) {
    console.error("Permit gap check failed:", err);
    return null;
  }
}
