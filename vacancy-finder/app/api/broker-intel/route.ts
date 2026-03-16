import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";

// GET: Fetch broker intel for an address or all recent intel
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
  const address = url.searchParams.get("address");
  const city = url.searchParams.get("city");

  let query = supabaseAdmin
    .from("broker_intel")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (address && city) {
    query = query.eq("address", address).eq("city", city);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST: Submit broker intel
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
    const { address, city, state, intel_type, notes, property_id } = body;

    if (!address || !city || !state || !intel_type) {
      return NextResponse.json(
        { error: "address, city, state, and intel_type are required" },
        { status: 400 }
      );
    }

    // Geocode the address if we don't have coordinates
    let lat = body.lat || null;
    let lng = body.lng || null;
    if (lat == null || lng == null) {
      const geo = await geocodeAddress(`${address}, ${city}, ${state}`);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("broker_intel")
      .insert({
        user_id: user.id,
        property_id: property_id || null,
        address,
        city,
        state,
        lat,
        lng,
        intel_type,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Broker intel submission failed:", error);
    return NextResponse.json(
      { error: "Failed to submit intel" },
      { status: 500 }
    );
  }
}
