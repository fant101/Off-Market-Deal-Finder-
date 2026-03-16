import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET: List user's watchlist entries
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
    .from("watchlist")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also fetch unread alert counts per watchlist
  const watchlistIds = (data || []).map((w) => w.id);
  const { data: alertCounts } = await supabaseAdmin
    .from("watchlist_alerts")
    .select("watchlist_id")
    .in("watchlist_id", watchlistIds)
    .eq("read", false);

  const countsMap = new Map<string, number>();
  for (const a of alertCounts || []) {
    countsMap.set(a.watchlist_id, (countsMap.get(a.watchlist_id) || 0) + 1);
  }

  const enriched = (data || []).map((w) => ({
    ...w,
    unread_alerts: countsMap.get(w.id) || 0,
  }));

  return NextResponse.json(enriched);
}

// POST: Create a new watchlist entry
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
    const { name, location, location_lat, location_lng, radius_miles, property_type, frequency } =
      body;

    if (!name || !location) {
      return NextResponse.json(
        { error: "name and location are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("watchlist")
      .insert({
        user_id: user.id,
        name,
        location,
        location_lat: location_lat || null,
        location_lng: location_lng || null,
        radius_miles: radius_miles || 5,
        property_type: property_type || null,
        frequency: frequency || "weekly",
        active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Watchlist create failed:", error);
    return NextResponse.json(
      { error: "Failed to create watchlist entry" },
      { status: 500 }
    );
  }
}

// PATCH: Update a watchlist entry (toggle active, change frequency, etc.)
export async function PATCH(request: NextRequest) {
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("watchlist")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Watchlist update failed:", error);
    return NextResponse.json(
      { error: "Failed to update watchlist entry" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a watchlist entry
export async function DELETE(request: NextRequest) {
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

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("watchlist")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
