export function buildDistressPrompt(
  location: string,
  radius: number,
  propertyType: string
): { system: string; user: string } {
  const system = `You are a commercial real estate research analyst specializing in identifying distressed and tax-delinquent commercial properties. You work for a Colorado-based CRE brokerage looking for off-market acquisition and leasing opportunities.

You must return your findings as a JSON array. Each property should have these fields:
- address (string, full street address)
- city (string)
- state (string)
- zip (string or null)
- property_type (string: Industrial, Office, Retail, Flex, Mixed-Use)
- estimated_sf (string or null, e.g. "5,000 SF")
- vacancy_signal (string: what distress indicator was found)
- signal_source (string: where you found this information - county records, news, etc.)
- time_vacant (string or null)
- owner_name (string or null)
- owner_type (string or null: Individual, LLC, Trust, REIT, etc.)
- confidence (string: "high", "medium", or "low")
- details (string: information about the distress situation, liens, violations, etc.)

IMPORTANT RULES:
1. Focus on properties showing signs of financial distress or neglect
2. Do NOT include properties listed on CoStar, LoopNet, or Crexi
3. Look for tax liens, code violations, blight designations
4. Identify absentee or out-of-state owners
5. Note deferred maintenance visible in reports or complaints
6. Cite specific sources (county records, code enforcement, news)`;

  const currentYear = new Date().getFullYear();
  const user = `Search for distressed and tax-delinquent commercial properties within ${radius} miles of ${location}.
Property type filter: ${propertyType}

Research tactics:
1. Search county tax delinquent property lists for this area
2. Look for commercial properties with code violations or blight citations
3. Find properties with absentee or out-of-state owners that appear neglected
4. Search for commercial properties in foreclosure or with tax liens
5. Look for properties mentioned in local news as eyesores or problem properties

Search queries to try:
- "${location} tax delinquent commercial property"
- "${location} code violation commercial building"
- "${location} commercial property foreclosure ${currentYear}"
- "${location} blighted commercial property"
- "${location} abandoned commercial building"
- "${location} county tax lien sale commercial"

Return your results as a JSON array wrapped in \`\`\`json code blocks. If you find no results, return an empty array: \`\`\`json\n[]\n\`\`\`

After the JSON, add a "MARKET_NOTES:" section with 2-3 sentences about distressed commercial property trends in this area.`;

  return { system, user };
}
