/**
 * Signal #15: Lease Expiration Modeling
 *
 * Uses county assessor records and public lease data to estimate
 * when a commercial lease might be expiring without renewal signals.
 */
import type { VacancySignal } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

export async function checkLeaseExpiration(
  address: string,
  city: string,
  state: string,
  ownerName?: string | null
): Promise<VacancySignal | null> {
  try {
    const systemPrompt = `You are a commercial real estate lease analyst. Search public records for lease-related information on a commercial property.

Look for:
1. Recorded lease terms in county records
2. Sublease listings (tenant trying to exit early)
3. CoStar, LoopNet, or Crexi listings showing available space
4. Recent lease comps in the area showing typical terms
5. Tenant improvement permit dates (can indicate lease start)
6. Signs of lease non-renewal (moving announcements, job postings at new locations)

Respond in JSON only:
{"found": true/false, "estimated_lease_end": "YYYY-MM or null", "sublease_listed": true/false, "space_available": true/false, "available_sf": "string or null", "tenant_name": "string or null", "details": "summary", "source_url": "url or null"}`;

    const userPrompt = `Search public records and commercial real estate databases for lease information at:

Address: ${address}
City: ${city}
State: ${state}
${ownerName ? `Owner: ${ownerName}` : ""}

Look for lease terms, sublease listings, and space availability. Report what you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.found) return null;

    let score = 15;
    if (data.sublease_listed) score += 35;
    if (data.space_available) score += 25;
    if (data.estimated_lease_end) {
      const endDate = new Date(data.estimated_lease_end);
      const now = new Date();
      const monthsUntil =
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsUntil <= 0) score += 40; // Already expired
      else if (monthsUntil <= 3) score += 30;
      else if (monthsUntil <= 6) score += 20;
      else if (monthsUntil <= 12) score += 10;
    }

    score = Math.min(100, score);

    return {
      type: "lease_expiration",
      source: "Lease & Listing Records",
      description: data.details || "Lease information found",
      score,
      raw_data: data,
      detected_at: new Date().toISOString(),
      evidence_url: data.source_url || undefined,
    };
  } catch (err) {
    console.error("Lease expiration check failed:", err);
    return null;
  }
}
