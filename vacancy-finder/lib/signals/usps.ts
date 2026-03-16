/**
 * Signal #9: USPS Vacancy Indicators
 *
 * Uses the USPS Address Validation API to check for vacancy flags.
 * USPS tracks "No-Stat" addresses where mail hasn't been collected
 * for 90+ days.  Also validates the address exists and checks
 * delivery status.
 */
import type { VacancySignal } from "./types";

interface USPSAddressValidation {
  valid: boolean;
  vacant: boolean;
  noStat: boolean;
  deliveryPoint: string | null;
  dpvConfirmation: string | null;  // Y=confirmed, D=missing secondary, N=not confirmed
  footnotes: string[];
}

export async function checkUSPSVacancy(
  address: string,
  city: string,
  state: string,
  zip: string | null
): Promise<VacancySignal | null> {
  const userId = process.env.USPS_USER_ID;

  // If no USPS API credentials, fall back to web-based verification
  if (!userId) {
    return checkUSPSVacancyFallback(address, city, state);
  }

  try {
    // USPS Web Tools Address Validation API
    const xml = `<AddressValidateRequest USERID="${userId}">
      <Revision>1</Revision>
      <Address>
        <Address1></Address1>
        <Address2>${escapeXml(address)}</Address2>
        <City>${escapeXml(city)}</City>
        <State>${escapeXml(state)}</State>
        <Zip5>${zip || ""}</Zip5>
        <Zip4></Zip4>
      </Address>
    </AddressValidateRequest>`;

    const res = await fetch(
      `https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&XML=${encodeURIComponent(xml)}`
    );

    if (!res.ok) return null;
    const text = await res.text();

    // Parse the XML response
    const validation = parseUSPSResponse(text);

    if (!validation.valid) return null;

    // Check vacancy indicators
    if (validation.vacant || validation.noStat) {
      return {
        type: "usps_vacancy",
        source: "USPS Address Validation API",
        description: validation.vacant
          ? "USPS reports this address as VACANT — no mail collected for 90+ days."
          : "USPS reports this as a No-Stat address — no regular mail delivery.",
        score: validation.vacant ? 90 : 75,
        raw_data: validation,
        detected_at: new Date().toISOString(),
      };
    }

    // DPV confirmation check
    if (validation.dpvConfirmation === "N") {
      return {
        type: "usps_vacancy",
        source: "USPS Address Validation API",
        description: "USPS cannot confirm delivery point — address may not be receiving mail.",
        score: 50,
        raw_data: validation,
        detected_at: new Date().toISOString(),
      };
    }

    return {
      type: "usps_vacancy",
      source: "USPS Address Validation API",
      description: "USPS confirms active mail delivery to this address.",
      score: 5,
      raw_data: validation,
      detected_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("USPS vacancy check failed:", err);
    return null;
  }
}

function parseUSPSResponse(xml: string): USPSAddressValidation {
  const getTag = (tag: string): string | null => {
    const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
    return match ? match[1] : null;
  };

  const footnotes = getTag("Footnotes") || "";
  const dpv = getTag("DPVConfirmation");
  const vacant = getTag("Vacant");

  return {
    valid: !xml.includes("<Error>"),
    vacant: vacant === "Y",
    noStat: footnotes.includes("F") || footnotes.includes("U"),
    deliveryPoint: getTag("DeliveryPoint"),
    dpvConfirmation: dpv,
    footnotes: footnotes.split(""),
  };
}

/**
 * Fallback: Use Claude web search to check USPS-related vacancy data
 * when we don't have direct API credentials.
 */
async function checkUSPSVacancyFallback(
  address: string,
  city: string,
  state: string
): Promise<VacancySignal | null> {
  // Import dynamically to avoid circular deps
  const { callClaudeWithWebSearch } = await import("../anthropic");

  try {
    const systemPrompt = `You are a mail delivery and vacancy research analyst. Check if a property address shows signs of mail non-delivery or vacancy through USPS and postal records.

Respond in JSON only:
{"found": true/false, "vacancy_indicator": true/false, "details": "summary", "source_url": "url or null"}`;

    const userPrompt = `Check USPS and postal delivery status for: ${address}, ${city}, ${state}. Is this address receiving mail? Any vacancy indicators?`;

    const rawResponse = await callClaudeWithWebSearch(systemPrompt, userPrompt);
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[0]);
    if (!data.found) return null;

    return {
      type: "usps_vacancy",
      source: "USPS Records (web search)",
      description: data.details || "USPS vacancy check completed",
      score: data.vacancy_indicator ? 65 : 15,
      raw_data: data,
      detected_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
