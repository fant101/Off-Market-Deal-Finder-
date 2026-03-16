/**
 * Signal #1: Street View Vision Analysis
 *
 * Uses Claude Vision to analyze Google Street View imagery for physical
 * vacancy indicators: boarded windows, no signage, empty parking lots,
 * "for lease" signs, overgrown landscaping, darkened interiors.
 */
import type { VacancySignal } from "./types";
import { getAnthropicClient } from "../anthropic";

export async function analyzeStreetView(
  lat: number,
  lng: number,
  address: string
): Promise<VacancySignal | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || lat == null || lng == null) return null;

  // Build multiple angles for better coverage
  const headings = [0, 90, 180, 270];
  const imageUrls = headings.map(
    (h) =>
      `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&heading=${h}&pitch=0&key=${apiKey}`
  );

  // Check if Street View is available (metadata endpoint)
  try {
    const metaRes = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${apiKey}`
    );
    const meta = await metaRes.json();
    if (meta.status !== "OK") return null;
  } catch {
    return null;
  }

  try {
    const anthropic = getAnthropicClient();

    // Fetch the front-facing image as base64
    const imgRes = await fetch(imageUrls[0]);
    if (!imgRes.ok) return null;
    const imgBuffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString("base64");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a commercial real estate vacancy analyst. Analyze the Street View image of a commercial property and assess vacancy indicators.

Score each indicator 0-10:
- SIGNAGE: Are there business signs? (0=active signage, 10=no signs/blank facade)
- WINDOWS: Are windows boarded, papered, or dark? (0=lit/active, 10=boarded up)
- PARKING: Is the parking lot empty? (0=cars present, 10=completely empty)
- MAINTENANCE: Is the property maintained? (0=well maintained, 10=overgrown/deteriorating)
- FOR_LEASE: Are there "For Lease/Sale/Rent" signs? (0=none, 10=prominent signs)
- ACTIVITY: Signs of human activity? (0=busy, 10=no activity visible)

Respond in JSON only:
{"vacancy_score": 0-100, "indicators": {"signage": 0-10, "windows": 0-10, "parking": 0-10, "maintenance": 0-10, "for_lease": 0-10, "activity": 0-10}, "description": "one sentence summary of what you see", "confident": true/false}`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Analyze this Street View image of ${address} for commercial vacancy indicators. Respond in JSON only.`,
            },
          ],
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("");

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const analysis = JSON.parse(jsonMatch[0]);
    const score = Math.min(100, Math.max(0, analysis.vacancy_score || 0));

    return {
      type: "streetview_vision",
      source: "Google Street View + Claude Vision",
      description: analysis.description || "Street View analysis completed",
      score,
      raw_data: analysis,
      detected_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Street View vision analysis failed:", err);
    return null;
  }
}
