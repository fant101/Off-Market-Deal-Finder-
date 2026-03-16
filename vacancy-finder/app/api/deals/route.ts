import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET: Fetch user's deal outcomes
export async function GET(request: NextRequest) {
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

  const { data, error } = await supabaseAdmin
    .from("deal_outcomes")
    .select("*, property:properties(address, city, state, property_type)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST: Record a deal outcome
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
    const { property_id, outcome_type, deal_value, close_date, notes } = body;

    if (!property_id || !outcome_type) {
      return NextResponse.json(
        { error: "property_id and outcome_type are required" },
        { status: 400 }
      );
    }

    // Get the current signals for this property to snapshot
    const { data: currentSignals } = await supabaseAdmin
      .from("vacancy_signals")
      .select("*")
      .eq("property_id", property_id)
      .order("detected_at", { ascending: false });

    const { data, error } = await supabaseAdmin
      .from("deal_outcomes")
      .insert({
        user_id: user.id,
        property_id,
        outcome_type,
        deal_value: deal_value || null,
        close_date: close_date || null,
        signals_at_discovery: currentSignals || [],
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Feature #20: Update learned weights based on successful outcomes
    if (outcome_type === "acquired" || outcome_type === "leased") {
      await updateLearnedWeights(currentSignals || []);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Deal outcome recording failed:", error);
    return NextResponse.json(
      { error: "Failed to record deal outcome" },
      { status: 500 }
    );
  }
}

/**
 * Feature #20: Update learned signal weights based on deal outcomes.
 *
 * When a deal closes successfully, we slightly increase the weight of
 * signals that were present at discovery. Over time, this makes the
 * scoring model better at predicting actionable properties.
 */
async function updateLearnedWeights(
  signals: Array<{ signal_type: string; score: number }>
) {
  if (signals.length === 0) return;

  const signalTypes = [...new Set(signals.map((s) => s.signal_type))];

  for (const signalType of signalTypes) {
    const { data: existing } = await supabaseAdmin
      .from("signal_weights")
      .select("*")
      .eq("signal_type", signalType)
      .single();

    if (!existing) continue;

    const currentWeight = existing.learned_weight ?? existing.base_weight;
    const sampleCount = existing.sample_count || 0;

    // Exponential moving average: new_weight = old_weight * 0.95 + boost * 0.05
    const boost = Math.min(currentWeight * 1.1, 0.25); // Cap at 25%
    const newWeight = currentWeight * 0.95 + boost * 0.05;

    await supabaseAdmin
      .from("signal_weights")
      .update({
        learned_weight: Math.round(newWeight * 10000) / 10000,
        sample_count: sampleCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("signal_type", signalType);
  }
}
