/**
 * Feature #8: Owner Portfolio Intelligence
 *
 * When you find one vacant property, look up the owner in county
 * records, then find ALL their other properties. Distressed owners
 * rarely have just one problem building.
 */
import type { OwnerPortfolio } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

export async function lookupOwnerPortfolio(
  ownerName: string,
  city: string,
  state: string
): Promise<OwnerPortfolio | null> {
  if (!ownerName || ownerName.trim().length < 3) return null;

  try {
    const systemPrompt = `You are a commercial real estate ownership research analyst. Search county assessor records, property tax databases, and public records to find all properties owned by a specific entity or person.

For each property found, report:
1. Address
2. City and state
3. Property type (commercial, industrial, retail, etc.)
4. Tax status (current, delinquent, lien)
5. Any known vacancy indicators

Also check:
- Colorado Secretary of State for related entities
- County clerk and recorder for recorded documents
- Public court records for any litigation

Respond in JSON only:
{"owner_name": "string", "entity_id": "string or null", "properties": [{"address": "string", "city": "string", "state": "string", "property_type": "string or null", "tax_status": "current|delinquent|lien|unknown", "has_vacancy_signals": true/false}], "related_entities": ["string"], "total_properties": number, "flagged_count": number, "details": "summary paragraph"}`;

    const userPrompt = `Search county assessor records and public property databases to find ALL commercial properties owned by:

Owner: ${ownerName}
Primary location: ${city}, ${state}

Search across Colorado counties. Look for all properties they own, tax status, and any distress signals. Report everything you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.properties || data.properties.length === 0) return null;

    return {
      owner_name: data.owner_name || ownerName,
      owner_entity_id: data.entity_id || null,
      properties: data.properties.map(
        (p: {
          address: string;
          city: string;
          state: string;
          property_type?: string;
          tax_status?: string;
          has_vacancy_signals?: boolean;
        }) => ({
          address: p.address,
          city: p.city,
          state: p.state,
          property_type: p.property_type || null,
          tax_status: p.tax_status || null,
          has_vacancy_signals: p.has_vacancy_signals || false,
          latest_signal_score: null,
        })
      ),
      total_properties: data.total_properties || data.properties.length,
      flagged_count:
        data.flagged_count ||
        data.properties.filter((p: { has_vacancy_signals?: boolean }) => p.has_vacancy_signals)
          .length,
      last_updated: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Owner portfolio lookup failed:", err);
    return null;
  }
}
