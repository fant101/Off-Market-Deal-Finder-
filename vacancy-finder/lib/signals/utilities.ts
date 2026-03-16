/**
 * Signal #10: Utility Disconnect Records
 *
 * Searches Colorado municipal open data portals for water shutoff,
 * utility disconnect, or low-usage indicators on commercial properties.
 */
import type { VacancySignal } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

const UTILITY_SOURCES: Record<string, string> = {
  Denver: "Denver Water (denverwater.org), Xcel Energy public records",
  Aurora: "Aurora Water (auroragov.org/water)",
  "Colorado Springs": "Colorado Springs Utilities (csu.org)",
  Boulder: "Boulder Utilities (bouldercolorado.gov/utilities)",
  "Fort Collins": "Fort Collins Utilities (fcgov.com/utilities)",
  Lakewood: "Denver Water, Consolidated Mutual Water",
  Pueblo: "Pueblo Board of Water Works (pueblowater.org)",
};

export async function checkUtilityDisconnect(
  address: string,
  city: string,
  state: string
): Promise<VacancySignal | null> {
  const source = UTILITY_SOURCES[city] || `${city} utility providers`;

  try {
    const systemPrompt = `You are a utility research analyst. Search for water shutoff, utility disconnect, or service termination records for a commercial property address.

Look for:
1. Water service disconnects or shutoff notices
2. Electrical service termination
3. Gas service disconnects
4. Properties on utility disconnect/shutoff lists
5. Open data portal records of utility status

Respond in JSON only:
{"found": true/false, "disconnected": true/false, "utility_type": "water|electric|gas|multiple|null", "disconnect_date": "date or null", "details": "summary", "source_url": "url or null"}`;

    const userPrompt = `Search ${source} and public records for utility disconnect or shutoff information at:

Address: ${address}
City: ${city}
State: ${state}

Look for water shutoff records, electrical disconnects, and any utility service terminations. Report what you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.found) return null;

    let score = 20;
    if (data.disconnected) {
      score = data.utility_type === "multiple" ? 90 : 70;
    }

    return {
      type: "utility_disconnect",
      source,
      description: data.details || "Utility records found",
      score: Math.min(100, score),
      raw_data: data,
      detected_at: new Date().toISOString(),
      evidence_url: data.source_url || undefined,
    };
  } catch (err) {
    console.error("Utility disconnect check failed:", err);
    return null;
  }
}
