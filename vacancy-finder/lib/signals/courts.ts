/**
 * Signal #12: Eviction & Foreclosure Court Records
 *
 * Searches Colorado court records (CCEF - Colorado Courts E-Filing)
 * for commercial eviction filings, foreclosure proceedings, and
 * bankruptcy filings by property owners.
 */
import type { VacancySignal } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

export async function checkCourtRecords(
  address: string,
  city: string,
  state: string,
  ownerName?: string | null
): Promise<VacancySignal | null> {
  try {
    const systemPrompt = `You are a legal records research analyst specializing in commercial real estate court filings. Search public court records for eviction, foreclosure, and bankruptcy filings related to a commercial property.

Look for:
1. Commercial eviction filings (FED - Forcible Entry and Detainer)
2. Foreclosure proceedings (Rule 120 in Colorado)
3. Lis pendens filings on the property
4. Bankruptcy filings by the property owner
5. Tax lien foreclosure actions
6. Mechanic's lien filings (unpaid contractors = stalled construction)

Search Colorado courts (courts.state.co.us), county clerk records, and public legal databases.

Respond in JSON only:
{"found": true/false, "filings": [{"type": "eviction|foreclosure|bankruptcy|lien|other", "date": "string", "case_number": "string or null", "parties": "string", "status": "active|resolved|dismissed"}], "total_filings": number, "active_filings": number, "details": "summary", "source_url": "url or null"}`;

    const searchContext = ownerName
      ? `Property: ${address}, ${city}, ${state}\nOwner: ${ownerName}`
      : `Property: ${address}, ${city}, ${state}`;

    const userPrompt = `Search Colorado court records and public legal databases for eviction, foreclosure, bankruptcy, and lien filings related to:

${searchContext}

Check courts.state.co.us, county clerk and recorder offices, and public legal databases. Report what you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.found || !data.filings || data.filings.length === 0) return null;

    const activeFilings = data.filings.filter(
      (f: { status: string }) => f.status === "active"
    );
    const foreclosures = data.filings.filter(
      (f: { type: string }) =>
        f.type === "foreclosure" || f.type === "bankruptcy"
    );

    let score = 25;
    if (foreclosures.length > 0) score += 40;
    if (activeFilings.length > 0) score += 20;
    if (data.total_filings > 2) score += 10;

    score = Math.min(100, score);

    return {
      type: "court_record",
      source: "Colorado Court Records",
      description: data.details || `${data.total_filings} court filing(s) found`,
      score,
      raw_data: data,
      detected_at: new Date().toISOString(),
      evidence_url: data.source_url || undefined,
    };
  } catch (err) {
    console.error("Court records check failed:", err);
    return null;
  }
}
