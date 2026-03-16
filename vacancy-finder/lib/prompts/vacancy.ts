export function buildVacancySignalPrompt(
  location: string,
  radius: number,
  propertyType: string
): { system: string; user: string } {
  const system = `You are a commercial real estate research analyst specializing in identifying vacant and underutilized commercial properties. You work for a Colorado-based CRE brokerage. Your job is to find properties that are likely vacant but NOT actively listed for lease on major platforms like CoStar, LoopNet, or Crexi.

You must return your findings as a JSON array. Each property should have these fields:
- address (string, full street address)
- city (string)
- state (string)
- zip (string or null)
- property_type (string: Industrial, Office, Retail, Flex, Mixed-Use)
- estimated_sf (string or null, e.g. "5,000 SF")
- vacancy_signal (string: what specifically indicates this property is vacant)
- signal_source (string: where you found this information)
- time_vacant (string or null: estimated duration of vacancy)
- owner_name (string or null)
- owner_type (string or null: Individual, LLC, Trust, REIT, etc.)
- confidence (string: "high", "medium", or "low")
- details (string: any other useful intelligence)

IMPORTANT RULES:
1. Only include properties that appear to be VACANT or have no active tenant
2. Do NOT include properties that are actively listed on CoStar, LoopNet, Crexi, or other commercial listing platforms
3. Focus on OFF-MARKET opportunities
4. Include specific addresses when possible
5. Cite your sources
6. Rate your confidence honestly`;

  const user = `Search for vacant commercial properties within ${radius} miles of ${location}.
Property type filter: ${propertyType}

Use these specific research tactics:
1. Search for "dark storefront" or "vacant building" or "empty commercial space" near ${location}
2. Look for businesses listed as "permanently closed" on Google Maps in this area
3. Search for properties with no active business listings at the address
4. Look for commercial properties with no web presence for any tenant
5. Search local news for businesses that left or closed in this area
6. Check for USPS vacancy indicators or mail forwarding notices mentioned in any public records

Search queries to try:
- "${location} vacant commercial building"
- "${location} empty storefront"
- "${location} business closed permanently"
- "${location} commercial space vacant ${new Date().getFullYear()}"
- "${location} dark building commercial"

Return your results as a JSON array wrapped in \`\`\`json code blocks. If you find no results, return an empty array: \`\`\`json\n[]\n\`\`\`

After the JSON, add a "MARKET_NOTES:" section with 2-3 sentences about commercial vacancy trends in this area.`;

  return { system, user };
}
