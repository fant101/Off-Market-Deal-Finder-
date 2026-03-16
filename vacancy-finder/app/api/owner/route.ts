import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { lookupOwnerPortfolio } from "@/lib/signals/owner";

export const maxDuration = 60;

// GET: Look up an owner's portfolio
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
  const ownerName = url.searchParams.get("owner");
  const city = url.searchParams.get("city") || "Denver";
  const state = url.searchParams.get("state") || "CO";

  if (!ownerName) {
    return NextResponse.json(
      { error: "owner parameter is required" },
      { status: 400 }
    );
  }

  // Check cache first
  const { data: cached } = await supabaseAdmin
    .from("owner_portfolios")
    .select("*")
    .eq("owner_name", ownerName)
    .maybeSingle();

  // If cached data is less than 7 days old, return it
  if (cached && cached.last_updated) {
    const cacheAge = Date.now() - new Date(cached.last_updated).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (cacheAge < sevenDays) {
      return NextResponse.json(cached);
    }
  }

  try {
    const portfolio = await lookupOwnerPortfolio(ownerName, city, state);

    if (!portfolio) {
      return NextResponse.json(
        { error: "No portfolio data found for this owner" },
        { status: 404 }
      );
    }

    // Cache the result
    await supabaseAdmin.from("owner_portfolios").upsert(
      {
        owner_name: portfolio.owner_name,
        owner_entity_id: portfolio.owner_entity_id,
        properties: portfolio.properties,
        total_properties: portfolio.total_properties,
        flagged_count: portfolio.flagged_count,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "owner_name" }
    );

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error("Owner portfolio lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to look up owner portfolio" },
      { status: 500 }
    );
  }
}
