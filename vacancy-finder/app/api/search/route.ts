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

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const body = await request.json();
    const { location, lat, lng, propertyType, radius, strategies } = body;

    if (!location || !strategies || strategies.length === 0) {
      return NextResponse.json(
        { error: "Location and at least one strategy are required" },
        { status: 400 }
      );
    }

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
    const strategyPromises = (strategies as Strategy[]).map(async (strategy) => {
      const builder = PROMPT_BUILDERS[strategy];
      if (!builder) return { properties: [] as VacantProperty[], marketNotes: "" };

      const { system, user: userPrompt } = builder(location, radius, propertyType);

      try {
        const response = await callClaudeWithWebSearch(system, userPrompt);
        return parseAIResponse(response, strategy);
      } catch (error) {
        console.error(`Strategy ${strategy} failed:`, error);
        // Retry once
        try {
          await new Promise((r) => setTimeout(r, 2000));
          const response = await callClaudeWithWebSearch(
            builder(location, radius, propertyType).system,
            builder(location, radius, propertyType).user
          );
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

    // Save to Supabase if user is authenticated
    let searchId: string | null = null;
    if (userId) {
      try {
        // Create search record
        const { data: searchRecord } = await supabaseAdmin
          .from("searches")
          .insert({
            user_id: userId,
            location_input: location,
            location_lat: searchLat,
            location_lng: searchLng,
            property_type: propertyType,
            radius_miles: radius,
            strategies,
            result_count: allProperties.length,
          })
          .select("id")
          .single();

        searchId = searchRecord?.id ?? null;

        // Insert properties and search results
        if (searchId && allProperties.length > 0) {
          for (const prop of allProperties) {
            // Upsert property
            const { data: propRecord } = await supabaseAdmin
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

            if (propRecord) {
              await supabaseAdmin.from("search_results").insert({
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
            }
          }
        }
      } catch (err) {
        console.error("Failed to save to Supabase:", err);
        // Don't fail the request if save fails
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
