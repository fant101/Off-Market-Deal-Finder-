/**
 * Signal #14: Business License Expiration Tracker
 *
 * Searches municipal business license databases for expired,
 * lapsed, or soon-to-expire business licenses at a commercial
 * property address.
 */
import type { VacancySignal } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

const LICENSE_SOURCES: Record<string, string> = {
  Denver: "Denver Excise & Licenses (denvergov.org/business-licensing)",
  Aurora: "Aurora Business Licensing (auroragov.org)",
  "Colorado Springs": "Colorado Springs Sales Tax / Business Licensing",
  Boulder: "Boulder Business Licensing (bouldercolorado.gov/licenses)",
  "Fort Collins": "Fort Collins Sales Tax Licensing",
  Lakewood: "Lakewood Business Licensing",
  Thornton: "Thornton Business License Registry",
  Westminster: "Westminster Sales Tax / Business License",
  Arvada: "Arvada Business License",
};

export async function checkBusinessLicense(
  address: string,
  city: string,
  state: string
): Promise<VacancySignal | null> {
  const source = LICENSE_SOURCES[city] || `${city} business licensing`;

  try {
    const systemPrompt = `You are a business license research analyst. Search municipal business license databases for active, expired, or lapsed licenses at a commercial property address.

Look for:
1. Active business licenses at this address
2. Expired or lapsed licenses (not renewed)
3. Revoked licenses
4. License renewal dates approaching
5. Sales tax licenses (indicator of active retail/business)

Respond in JSON only:
{"found": true/false, "licenses": [{"business_name": "string", "license_type": "string", "status": "active|expired|revoked|pending", "expiry_date": "string or null", "issue_date": "string or null"}], "all_expired": true/false, "no_active_licenses": true/false, "details": "summary", "source_url": "url or null"}`;

    const userPrompt = `Search ${source} and public records for business licenses at:

Address: ${address}
City: ${city}
State: ${state}

Look for active, expired, or revoked business licenses. Report what you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.found) return null;

    let score = 10;
    if (data.no_active_licenses) score = 75;
    else if (data.all_expired) score = 80;
    else {
      const expired = (data.licenses || []).filter(
        (l: { status: string }) => l.status === "expired" || l.status === "revoked"
      );
      if (expired.length > 0) score = 40 + expired.length * 10;
    }

    score = Math.min(100, score);

    return {
      type: "license_expiry",
      source,
      description: data.details || "Business license records found",
      score,
      raw_data: data,
      detected_at: new Date().toISOString(),
      evidence_url: data.source_url || undefined,
    };
  } catch (err) {
    console.error("Business license check failed:", err);
    return null;
  }
}
