import type { VacantProperty } from "@/lib/types";

export function buildOutreachPrompt(
  property: VacantProperty,
  tone: "direct" | "soft" | "advisory"
): { system: string; user: string } {
  const toneGuide = {
    direct: "Direct and confident. Get to the point quickly. The broker knows what they want and is making a clear proposition.",
    soft: "Relationship-building and warm. Focus on establishing a connection first, then gently introduce the opportunity. Less transactional.",
    advisory: "Value-add and advisory. Position the broker as an expert who can help the owner maximize their asset's potential. Lead with insights, not asks.",
  };

  const system = `You are a commercial real estate copywriter for Resolute, Inc., a Colorado-based commercial real estate brokerage and acquisitions firm. You write outreach emails and letters on behalf of CRE brokers to property owners.

Your tone should be: ${toneGuide[tone]}

Key guidelines:
- Professional but not corporate. These are real people talking to real people.
- Reference the specific vacancy signal naturally — don't say "I noticed your building is empty" out of nowhere. Be tactful.
- Position Resolute as knowledgeable about the local market.
- Keep it concise — property owners get a lot of mail. Under 200 words for emails.
- Include a clear call to action.
- Do NOT use generic real estate jargon or sound like a template.`;

  const user = `Write an outreach email from a Resolute, Inc. broker to the owner of this property:

Property: ${property.address}, ${property.city}, ${property.state} ${property.zip || ""}
Type: ${property.property_type}
Size: ${property.estimated_sf || "Unknown"}
Vacancy Signal: ${property.vacancy_signal}
Source: ${property.signal_source}
Time Vacant: ${property.time_vacant || "Unknown"}
Owner: ${property.owner_name || "Property Owner"}
Owner Type: ${property.owner_type || "Unknown"}

Additional Details: ${property.details}

Write the email with:
- A subject line
- Professional greeting
- Body (under 200 words)
- Clear call to action
- Professional sign-off from a Resolute broker

Format the email cleanly with clear sections.`;

  return { system, user };
}
