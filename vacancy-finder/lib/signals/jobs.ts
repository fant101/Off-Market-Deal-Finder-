/**
 * Signal #16: Job Posting Signals
 *
 * If a company at a commercial address stops posting jobs, closes all
 * listings, or starts posting jobs at a different address, they may be
 * moving or closing.
 */
import type { VacancySignal } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

export async function checkJobPostings(
  address: string,
  city: string,
  state: string,
  ownerName?: string | null
): Promise<VacancySignal | null> {
  // This signal requires a known business name to be useful
  if (!ownerName) return null;

  try {
    const systemPrompt = `You are a business intelligence analyst. Search job boards and company pages to determine if a business is actively hiring at a specific location, or if they appear to be moving/closing.

Look for:
1. Active job postings at this address
2. Job postings at a DIFFERENT address (indicating relocation)
3. Mass layoff notices (WARN Act filings)
4. Company announcements about office changes
5. LinkedIn company page updates about location changes

Respond in JSON only:
{"found": true/false, "active_postings_here": number, "postings_elsewhere": number, "relocation_signals": true/false, "layoff_notices": true/false, "details": "summary", "source_url": "url or null"}`;

    const userPrompt = `Search job boards (Indeed, LinkedIn, Glassdoor) and public records for job posting activity by:

Company/Business: ${ownerName}
Current Address: ${address}, ${city}, ${state}

Are they actively hiring at this location? Have they posted jobs at a different address? Any layoff or relocation announcements? Report what you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.found) return null;

    let score = 10;
    if (data.active_postings_here === 0 && data.postings_elsewhere > 0) {
      score = 70; // Strong relocation signal
    } else if (data.relocation_signals) {
      score = 65;
    } else if (data.layoff_notices) {
      score = 60;
    } else if (data.active_postings_here === 0) {
      score = 30; // No postings, but could just be not hiring
    } else {
      score = 5; // Active hiring here
    }

    return {
      type: "job_posting",
      source: "Job Board Analysis",
      description: data.details || "Job posting analysis completed",
      score: Math.min(100, score),
      raw_data: data,
      detected_at: new Date().toISOString(),
      evidence_url: data.source_url || undefined,
    };
  } catch (err) {
    console.error("Job posting check failed:", err);
    return null;
  }
}
