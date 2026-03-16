import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("saved_properties")
    .select("*, property:properties(*)")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For each saved property, get the latest search result data
  const enriched = await Promise.all(
    (data || []).map(async (saved) => {
      const { data: searchResults } = await supabaseAdmin
        .from("search_results")
        .select("*")
        .eq("property_id", saved.property_id)
        .order("created_at", { ascending: false })
        .limit(1);

      return {
        ...saved,
        search_result: searchResults?.[0] || null,
      };
    })
  );

  return NextResponse.json(enriched);
}
