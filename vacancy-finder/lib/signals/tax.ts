/**
 * Signal #3: County Tax Delinquency Detection
 *
 * Searches Colorado county assessor open data portals for properties
 * with delinquent taxes, tax liens, or significantly reduced valuations.
 * Uses Claude with web search to query county-specific data sources.
 */
import type { VacancySignal } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

// Colorado county assessor data sources
const COUNTY_DATA_SOURCES: Record<string, string> = {
  Denver: "Denver Open Data (denvergov.org/opendata), Denver Assessor",
  Arapahoe: "Arapahoe County Assessor (arapahoegov.com)",
  Jefferson: "Jefferson County Assessor (jeffco.us)",
  "El Paso": "El Paso County Assessor (asr.elpasoco.com)",
  Adams: "Adams County Assessor (adcogov.org)",
  Boulder: "Boulder County Assessor (bouldercounty.gov)",
  Douglas: "Douglas County Assessor (douglas.co.us)",
  Larimer: "Larimer County Assessor (larimer.gov)",
  Weld: "Weld County Assessor (weld.gov)",
  Mesa: "Mesa County Assessor (mesacounty.us)",
};

export async function checkTaxDelinquency(
  address: string,
  city: string,
  state: string,
  county?: string
): Promise<VacancySignal | null> {
  if (state !== "CO" && state !== "Colorado") return null;

  const targetCounty = county || inferCounty(city);
  const dataSource = targetCounty
    ? COUNTY_DATA_SOURCES[targetCounty] || `${targetCounty} County Assessor`
    : "Colorado county assessor records";

  try {
    const systemPrompt = `You are a commercial real estate research analyst specializing in Colorado property tax records. Your job is to find tax delinquency, tax lien, or distress information for a specific commercial property.

Search for:
1. Property tax delinquency status
2. Tax lien sales or certificates
3. Significant valuation decreases (>20% drop)
4. Owner changes indicating distress (bank/lender ownership)

Respond in JSON only:
{"found": true/false, "delinquent": true/false, "lien": true/false, "amount_owed": "string or null", "years_delinquent": number or null, "valuation_change": "string or null", "owner_info": "string or null", "details": "one paragraph summary", "source_url": "url or null"}`;

    const userPrompt = `Search ${dataSource} and other public records for tax delinquency information on this commercial property:

Address: ${address}
City: ${city}
State: ${state}
County: ${targetCounty || "Unknown"}

Search the county assessor website, tax lien databases, and public records. Report what you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.found) return null;

    let score = 20; // Base score for having a record
    if (data.delinquent) score += 40;
    if (data.lien) score += 30;
    if (data.years_delinquent && data.years_delinquent >= 2) score += 15;
    if (data.valuation_change) score += 10;

    score = Math.min(100, score);

    return {
      type: "tax_delinquency",
      source: dataSource,
      description: data.details || "Tax delinquency records found",
      score,
      raw_data: data,
      detected_at: new Date().toISOString(),
      evidence_url: data.source_url || undefined,
    };
  } catch (err) {
    console.error("Tax delinquency check failed:", err);
    return null;
  }
}

function inferCounty(city: string): string | null {
  const cityCountyMap: Record<string, string> = {
    Denver: "Denver",
    Aurora: "Arapahoe",
    Lakewood: "Jefferson",
    "Colorado Springs": "El Paso",
    Thornton: "Adams",
    Westminster: "Adams",
    Arvada: "Jefferson",
    Centennial: "Arapahoe",
    Boulder: "Boulder",
    "Fort Collins": "Larimer",
    Loveland: "Larimer",
    Greeley: "Weld",
    "Castle Rock": "Douglas",
    "Highlands Ranch": "Douglas",
    Broomfield: "Broomfield",
    "Grand Junction": "Mesa",
    Pueblo: "Pueblo",
    Longmont: "Boulder",
    Brighton: "Adams",
    "Commerce City": "Adams",
    Littleton: "Arapahoe",
    Englewood: "Arapahoe",
    Parker: "Douglas",
    "Wheat Ridge": "Jefferson",
    Golden: "Jefferson",
    Northglenn: "Adams",
    "Federal Heights": "Adams",
    "Greenwood Village": "Arapahoe",
    "Cherry Hills Village": "Arapahoe",
    "Lone Tree": "Douglas",
  };
  return cityCountyMap[city] || null;
}
