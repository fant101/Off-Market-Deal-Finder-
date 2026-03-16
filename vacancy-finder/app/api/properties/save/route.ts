import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { propertyId, notes, status } = body;

  if (!propertyId) {
    return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
  }

  // If status is provided, this is a status update on an existing saved property
  if (status) {
    const validStatuses = ["new", "contacted", "in_conversation", "dead"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("saved_properties")
      .update({ status, ...(notes !== undefined ? { notes } : {}) })
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  // Otherwise, this is a new save — upsert but don't overwrite existing status
  const { data: existing } = await supabaseAdmin
    .from("saved_properties")
    .select("id")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (existing) {
    // Already saved, just update notes if provided
    const { data, error } = await supabaseAdmin
      .from("saved_properties")
      .update({ ...(notes !== undefined ? { notes } : {}) })
      .eq("user_id", user.id)
      .eq("property_id", propertyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // New save
  const { data, error } = await supabaseAdmin
    .from("saved_properties")
    .insert({
      user_id: user.id,
      property_id: propertyId,
      notes: notes || null,
      status: "new",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { propertyId } = await request.json();

  if (!propertyId) {
    return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("saved_properties")
    .delete()
    .eq("user_id", user.id)
    .eq("property_id", propertyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
