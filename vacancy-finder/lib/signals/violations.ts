/**
 * Signal #11: Code Enforcement / Violations
 *
 * Searches city code enforcement databases for violations at the
 * property address: boarded-up buildings, unsecured structures,
 * overgrown lots, blight designations.
 */
import type { VacancySignal } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

// Denver Open Data has a code enforcement dataset
const VIOLATION_SOURCES: Record<string, string> = {
  Denver: "Denver 311 / Code Enforcement (denvergov.org/opendata), Denver Community Planning & Development",
  Aurora: "Aurora Code Enforcement (auroragov.org)",
  "Colorado Springs": "Colorado Springs Code Enforcement (coloradosprings.gov)",
  Boulder: "Boulder Code Enforcement (bouldercolorado.gov)",
  "Fort Collins": "Fort Collins Neighborhood Services",
  Lakewood: "Lakewood Code Enforcement",
};

export async function checkCodeViolations(
  address: string,
  city: string,
  state: string
): Promise<VacancySignal | null> {
  const source = VIOLATION_SOURCES[city] || `${city} code enforcement`;

  try {
    const systemPrompt = `You are a municipal code enforcement research analyst. Search for code violations, blight designations, and enforcement actions at a commercial property address.

Look for:
1. Boarded-up building violations
2. Unsecured/dangerous structure notices
3. Overgrown vegetation/property maintenance violations
4. Blight designations
5. Graffiti/vandalism reports indicating neglect
6. Zoning violations
7. Fire code violations indicating non-occupancy

Respond in JSON only:
{"found": true/false, "violations": [{"type": "string", "date": "string", "status": "open|closed", "description": "string"}], "total_violations": number, "open_violations": number, "vacancy_related": true/false, "details": "summary", "source_url": "url or null"}`;

    const userPrompt = `Search ${source} and public records for code enforcement violations at:

Address: ${address}
City: ${city}
State: ${state}

Look for building violations, property maintenance issues, blight designations, and any enforcement actions. Report what you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.found) return null;

    let score = 15;
    if (data.vacancy_related) score += 40;
    if (data.open_violations > 0) score += 20;
    if (data.total_violations > 3) score += 15;

    score = Math.min(100, score);

    return {
      type: "code_violation",
      source,
      description: data.details || `${data.total_violations} violation(s) found`,
      score,
      raw_data: data,
      detected_at: new Date().toISOString(),
      evidence_url: data.source_url || undefined,
    };
  } catch (err) {
    console.error("Code violation check failed:", err);
    return null;
  }
}
