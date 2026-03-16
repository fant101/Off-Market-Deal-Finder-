import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// GET: Fetch alerts for a watchlist (or all user's alerts)
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

  const url = new URL(request.url);
  const watchlistId = url.searchParams.get("watchlist_id");
  const unreadOnly = url.searchParams.get("unread") === "true";

  // Get user's watchlist IDs
  const { data: watchlists } = await supabaseAdmin
    .from("watchlist")
    .select("id")
    .eq("user_id", user.id);

  const watchlistIds = (watchlists || []).map((w) => w.id);
  if (watchlistIds.length === 0) {
    return NextResponse.json([]);
  }

  let query = supabaseAdmin
    .from("watchlist_alerts")
    .select("*, property:properties(address, city, state)")
    .in("watchlist_id", watchlistId ? [watchlistId] : watchlistIds)
    .order("created_at", { ascending: false })
    .limit(100);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// PATCH: Mark alerts as read
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
    const { alert_ids } = body as { alert_ids: string[] };

    if (!alert_ids || alert_ids.length === 0) {
      return NextResponse.json(
        { error: "alert_ids required" },
        { status: 400 }
      );
    }

    // Verify the alerts belong to user's watchlists
    const { data: watchlists } = await supabaseAdmin
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id);

    const watchlistIds = (watchlists || []).map((w) => w.id);

    const { error } = await supabaseAdmin
      .from("watchlist_alerts")
      .update({ read: true })
      .in("id", alert_ids)
      .in("watchlist_id", watchlistIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update alerts" },
      { status: 500 }
    );
  }
}
