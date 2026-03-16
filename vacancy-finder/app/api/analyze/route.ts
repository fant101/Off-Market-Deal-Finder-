import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { analyzeProperty } from "@/lib/signals/analyze";
import type { VacancySignal } from "@/lib/signals/types";

export const maxDuration = 120; // Allow up to 2 minutes for full analysis

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { propertyId, address, city, state, zip, lat, lng, ownerName, signalTypes } = body;

    if (!address || !city || !state) {
      return NextResponse.json(
        { error: "address, city, and state are required" },
        { status: 400 }
      );
    }

    // Check for broker intel on this property
    const existingSignals: VacancySignal[] = [];
    if (propertyId) {
      const { data: intelData } = await supabaseAdmin
        .from("broker_intel")
        .select("*")
        .eq("property_id", propertyId);

      if (intelData) {
        for (const intel of intelData) {
          existingSignals.push({
            type: "broker_intel",
            source: "Broker Intel (crowdsourced)",
            description: `${intel.intel_type}: ${intel.notes || "No details"}`,
            score: intel.intel_type === "vacant_confirmed" ? 90 : 50,
            raw_data: intel,
            detected_at: intel.created_at,
          });
        }
      }
    }

    // Run full analysis
    const result = await analyzeProperty({
      address,
      city,
      state,
      zip,
      lat,
      lng,
      ownerName,
      existingSignals,
      signalTypes,
    });

    // Persist signals and score to database
    if (propertyId) {
      // Save individual signals
      for (const signal of result.signals) {
        if (signal.type === "broker_intel") continue; // Already in DB
        await supabaseAdmin.from("vacancy_signals").insert({
          property_id: propertyId,
          signal_type: signal.type,
          source: signal.source,
          description: signal.description,
          score: signal.score,
          raw_data: signal.raw_data || null,
          evidence_url: signal.evidence_url || null,
          detected_at: signal.detected_at,
        });
      }

      // Upsert composite score
      await supabaseAdmin.from("vacancy_scores").upsert(
        {
          property_id: propertyId,
          composite_score: result.score.composite_score,
          confidence: result.score.confidence,
          signal_count: result.score.signal_count,
          predicted_vacant: result.score.predicted_vacant,
          reasoning: result.score.reasoning,
          breakdown: result.score.breakdown,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "property_id" }
      );

      // Update property record
      await supabaseAdmin
        .from("properties")
        .update({
          composite_score: result.score.composite_score,
          last_analyzed_at: new Date().toISOString(),
        })
        .eq("id", propertyId);

      // Save historical scan (Feature #19)
      await supabaseAdmin.from("historical_scans").insert({
        property_id: propertyId,
        composite_score: result.score.composite_score,
        signal_count: result.score.signal_count,
        signals_summary: result.score.reasoning,
        signals_data: result.signals,
      });
    }

    return NextResponse.json({
      score: result.score,
      signals: result.signals,
      duration_ms: result.duration_ms,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Property analysis failed:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
