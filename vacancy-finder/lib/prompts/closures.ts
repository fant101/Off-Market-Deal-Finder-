export function buildClosuresPrompt(
  location: string,
  radius: number,
  propertyType: string
): { system: string; user: string } {
  const system = `You are a commercial real estate research analyst specializing in tracking recent business closures and relocations that leave commercial spaces vacant. You work for a Colorado-based CRE brokerage seeking off-market opportunities.

You must return your findings as a JSON array. Each property should have these fields:
- address (string, full street address)
- city (string)
- state (string)
- zip (string or null)
- property_type (string: Industrial, Office, Retail, Flex, Mixed-Use)
- estimated_sf (string or null, e.g. "5,000 SF")
- vacancy_signal (string: what business closed/left and when)
- signal_source (string: where you found this information)
- time_vacant (string or null: estimated duration since closure)
- owner_name (string or null)
- owner_type (string or null: Individual, LLC, Trust, REIT, etc.)
- confidence (string: "high", "medium", or "low")
- details (string: information about the closure and the space)

IMPORTANT RULES:
1. Only include properties where a business has RECENTLY closed, relocated, or shut down (within the last 12 months)
2. Do NOT include properties already listed on CoStar, LoopNet, or Crexi
3. Focus on specific addresses and business names
4. Cite news articles, Google Maps data, or other sources
5. Rate confidence as "high" if you have a confirmed closure with address, "medium" if the closure is confirmed but address is approximate, "low" if the information is indirect`;

  const currentYear = new Date().getFullYear();
  const user = `Search for recent business closures and relocations within ${radius} miles of ${location} that would have left commercial space vacant.
Property type filter: ${propertyType}

Research tactics:
1. Search for recent news about business closures in ${location}
2. Look for businesses that relocated away from this area
3. Search for restaurant/retail closures that left storefronts empty
4. Look for office space vacated by companies that moved or downsized
5. Check for warehouse/industrial spaces left by businesses that shut down

Search queries to try:
- "${location} business closing ${currentYear}"
- "${location} store closing"
- "${location} restaurant closed"
- "${location} company relocating from"
- "${location} office space vacated"
- "${location} business shutdown ${currentYear}"

Return your results as a JSON array wrapped in \`\`\`json code blocks. If you find no results, return an empty array: \`\`\`json\n[]\n\`\`\`

After the JSON, add a "MARKET_NOTES:" section with 2-3 sentences about recent business closure trends in this area.`;

  return { system, user };
}
