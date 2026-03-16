import { NextRequest, NextResponse } from "next/server";
import { callClaudeWithWebSearch } from "@/lib/anthropic";
import { geocodeAddress, batchGeocode } from "@/lib/geocode";
import { parseAIResponse, deduplicateProperties } from "@/lib/parseResults";
import { buildVacancySignalPrompt } from "@/lib/prompts/vacancy";
import { buildClosuresPrompt } from "@/lib/prompts/closures";
import { buildDistressPrompt } from "@/lib/prompts/distress";
import { buildPermitGapsPrompt } from "@/lib/prompts/permits";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Strategy, VacantProperty } from "@/lib/types";

const PROMPT_BUILDERS: Record<
  Strategy,
  (location: string, radius: number, propertyType: string) => { system: string; user: string }
> = {
  vacancy_signals: buildVacancySignalPrompt,
  recent_closures: buildClosuresPrompt,
  distressed: buildDistressPrompt,
  permit_gaps: buildPermitGapsPrompt,
};

const VALID_STRATEGIES: Strategy[] = [
  "vacancy_signals",
  "recent_closures",
  "distressed",
  "permit_gaps",
];

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const body = await request.json();
    const { location, lat, lng, propertyType, radius, strategies } = body;

    if (!location || !strategies || !Array.isArray(strategies) || strategies.length === 0) {
      return NextResponse.json(
        { error: "Location and at least one strategy are required" },
        { status: 400 }
      );
    }

    // Validate strategies
    const validStrategies = (strategies as string[]).filter((s) =>
      VALID_STRATEGIES.includes(s as Strategy)
    ) as Strategy[];

    if (validStrategies.length === 0) {
      return NextResponse.json(
        { error: "No valid strategies provided" },
        { status: 400 }
      );
    }

    // Validate radius
    const searchRadius = Math.max(1, Math.min(25, Number(radius) || 5));

    // Geocode the location if lat/lng not provided
    let searchLat = lat;
    let searchLng = lng;
    if (!searchLat || !searchLng) {
      const geo = await geocodeAddress(location);
      if (geo) {
        searchLat = geo.lat;
        searchLng = geo.lng;
      }
    }

    // Build and fire strategy-specific Claude calls in parallel
    const strategyPromises = validStrategies.map(async (strategy) => {
      const builder = PROMPT_BUILDERS[strategy];
      if (!builder) return { properties: [] as VacantProperty[], marketNotes: "" };

      const { system, user: userPrompt } = builder(location, searchRadius, propertyType);

      try {
        const response = await callClaudeWithWebSearch(system, userPrompt);
        return parseAIResponse(response, strategy);
      } catch (error) {
        console.error(`Strategy ${strategy} failed:`, error);
        // Retry once with backoff
        try {
          await new Promise((r) => setTimeout(r, 2000));
          const response = await callClaudeWithWebSearch(system, userPrompt);
          return parseAIResponse(response, strategy);
        } catch {
          return { properties: [] as VacantProperty[], marketNotes: "" };
        }
      }
    });

    const results = await Promise.allSettled(strategyPromises);

    // Collect all properties and market notes
    let allProperties: VacantProperty[] = [];
    const allMarketNotes: string[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        allProperties.push(...result.value.properties);
        if (result.value.marketNotes) {
          allMarketNotes.push(result.value.marketNotes);
        }
      }
    }

    // Deduplicate
    allProperties = deduplicateProperties(allProperties);

    // Batch geocode all addresses
    const addressesToGeocode = allProperties
      .filter((p) => !p.lat || !p.lng)
      .map((p) => `${p.address}, ${p.city}, ${p.state}`);

    if (addressesToGeocode.length > 0) {
      const geocodeResults = await batchGeocode(addressesToGeocode);
      for (const prop of allProperties) {
        if (!prop.lat || !prop.lng) {
          const key = `${prop.address}, ${prop.city}, ${prop.state}`;
          const geo = geocodeResults.get(key);
          if (geo) {
            prop.lat = geo.lat;
            prop.lng = geo.lng;
          }
        }
      }
    }

    // Save to Supabase if user is authenticated and assign DB IDs
    let searchId: string | null = null;
    if (userId) {
      try {
        const { data: searchRecord, error: searchError } = await supabaseAdmin
          .from("searches")
          .insert({
            user_id: userId,
            location_input: location,
            location_lat: searchLat,
            location_lng: searchLng,
            property_type: propertyType,
            radius_miles: searchRadius,
            strategies: validStrategies,
            result_count: allProperties.length,
          })
          .select("id")
          .single();

        if (searchError) {
          console.error("Failed to create search record:", searchError);
        }

        searchId = searchRecord?.id ?? null;

        if (searchId && allProperties.length > 0) {
          for (const prop of allProperties) {
            const { data: propRecord, error: propError } = await supabaseAdmin
              .from("properties")
              .upsert(
                {
                  address: prop.address,
                  city: prop.city,
                  state: prop.state,
                  zip: prop.zip,
                  lat: prop.lat,
                  lng: prop.lng,
                  property_type: prop.property_type,
                  estimated_sf: prop.estimated_sf,
                  last_seen_at: new Date().toISOString(),
                },
                { onConflict: "address,city,state" }
              )
              .select("id")
              .single();

            if (propError) {
              console.error("Failed to upsert property:", propError);
              continue;
            }

            if (propRecord) {
              // Attach the DB ID to the property for frontend use
              prop.id = propRecord.id;

              const { error: resultError } = await supabaseAdmin
                .from("search_results")
                .insert({
                  search_id: searchId,
                  property_id: propRecord.id,
                  vacancy_signal: prop.vacancy_signal,
                  signal_source: prop.signal_source,
                  time_vacant: prop.time_vacant,
                  owner_name: prop.owner_name,
                  owner_type: prop.owner_type,
                  confidence: prop.confidence,
                  details: prop.details,
                  strategy: prop.strategy,
                });

              if (resultError) {
                console.error("Failed to insert search result:", resultError);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to save to Supabase:", err);
      }
    }

    return NextResponse.json({
      searchId,
      properties: allProperties,
      marketNotes: allMarketNotes.join("\n\n"),
    });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
