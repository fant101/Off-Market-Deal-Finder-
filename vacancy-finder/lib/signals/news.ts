/**
 * Signal #17: News & Press NLP Pipeline
 *
 * Searches Denver Business Journal, Colorado Real Estate Journal,
 * local news, and business press for mentions of closures,
 * relocations, layoffs, or vacancy at commercial properties.
 */
import type { VacancySignal } from "./types";
import { callClaudeWithWebSearch } from "../anthropic";

export async function checkNewsMentions(
  address: string,
  city: string,
  state: string,
  ownerName?: string | null
): Promise<VacancySignal | null> {
  try {
    const searchTerms = ownerName
      ? `"${address}" OR "${ownerName}" ${city} ${state}`
      : `"${address}" ${city} ${state}`;

    const systemPrompt = `You are a commercial real estate news analyst. Search local business press and news sources for any mentions of a commercial property that indicate vacancy, closure, relocation, or distress.

Priority news sources:
- Denver Business Journal (bizjournals.com/denver)
- Colorado Real Estate Journal (crej.com)
- Denver Post business section
- Local TV station business news (9news.com, thedenverchannel.com)
- Colorado Politics
- Local community newspapers

Look for:
1. Business closures or relocations
2. Layoff announcements
3. Bankruptcy filings reported in press
4. Lease expirations mentioned in CRE publications
5. Building sales or foreclosure reports
6. Vacancy reports in market surveys
7. Construction/renovation stalls

Respond in JSON only:
{"found": true/false, "articles": [{"headline": "string", "source": "string", "date": "string", "relevance": "closure|relocation|layoff|vacancy|sale|distress|other", "url": "url or null"}], "vacancy_mentioned": true/false, "closure_mentioned": true/false, "details": "summary", "source_url": "url or null"}`;

    const userPrompt = `Search Colorado business news and commercial real estate publications for mentions of:

${searchTerms}

Address: ${address}
City: ${city}
State: ${state}
${ownerName ? `Business/Owner: ${ownerName}` : ""}

Look for any news about closures, relocations, layoffs, vacancy, or distress at this property. Report what you find.`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);

    if (!data.found || !data.articles || data.articles.length === 0) return null;

    let score = 15;
    if (data.closure_mentioned) score += 45;
    if (data.vacancy_mentioned) score += 35;

    const closureArticles = (data.articles || []).filter(
      (a: { relevance: string }) =>
        a.relevance === "closure" ||
        a.relevance === "relocation" ||
        a.relevance === "vacancy"
    );
    score += closureArticles.length * 10;

    score = Math.min(100, score);

    return {
      type: "news_closure",
      source: "Business News Analysis",
      description: data.details || `${data.articles.length} news mention(s) found`,
      score,
      raw_data: data,
      detected_at: new Date().toISOString(),
      evidence_url: data.articles[0]?.url || data.source_url || undefined,
    };
  } catch (err) {
    console.error("News check failed:", err);
    return null;
  }
}
