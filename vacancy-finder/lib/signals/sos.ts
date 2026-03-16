/**
 * Signal #4: Colorado Secretary of State Entity Cross-Reference
 *
 * Checks if the business at a commercial address has a dissolved,
 * delinquent, or inactive entity filing with the Colorado Secretary
 * of State (sos.state.co.us).
 */
import type { VacancySignal } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

export async function checkSOSEntity(
  address: string,
  city: string,
  state: string,
  ownerName?: string | null
): Promise<VacancySignal | null> {
  if (state !== "CO" && state !== "Colorado") return null;

  try {
    const systemPrompt = `You are a business entity research analyst. Search the Colorado Secretary of State business database (sos.state.co.us) and other public records to find business entities registered at or associated with a specific commercial property address.

Look for:
1. Any business entities registered at this address
2. Entity status: Good Standing, Delinquent, Dissolved, Withdrawn, Administratively Dissolved
3. Date of dissolution or delinquency
4. Registered agent changes indicating abandonment

Respond in JSON only:
{"found": true/false, "entities": [{"name": "string", "status": "string", "entity_id": "string or null", "filed_date": "string or null", "dissolved_date": "string or null"}], "all_inactive": true/false, "details": "one paragraph summary", "source_url": "url or null"}`;

    const searchTerm = ownerName
      ? `${ownerName} at ${address}, ${city}, CO`
      : `${address}, ${city}, CO`;

    const userPrompt = `Search the Colorado Secretary of State business database and public records for business entities at:

Address: ${address}
City: ${city}
State: Colorado
${ownerName ? `Known owner/business: ${ownerName}` : ""}

Check sos.state.co.us for entity status. Report what you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.found || !data.entities || data.entities.length === 0) return null;

    const dissolved = data.entities.filter(
      (e: { status: string }) =>
        e.status.toLowerCase().includes("dissolv") ||
        e.status.toLowerCase().includes("withdrawn") ||
        e.status.toLowerCase().includes("delinquent")
    );

    let score = 15; // Base for having entity records
    if (data.all_inactive) score = 80;
    else if (dissolved.length > 0) score = 55 + dissolved.length * 5;

    score = Math.min(100, score);

    return {
      type: "sos_entity",
      source: "Colorado Secretary of State",
      description:
        data.details ||
        `${data.entities.length} entity/entities found. ${dissolved.length} dissolved/inactive.`,
      score,
      raw_data: data,
      detected_at: new Date().toISOString(),
      evidence_url: data.source_url || "https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do",
    };
  } catch (err) {
    console.error("SOS entity check failed:", err);
    return null;
  }
}
