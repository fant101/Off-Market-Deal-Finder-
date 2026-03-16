import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get search
  const { data: search, error: searchError } = await supabaseAdmin
    .from("searches")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (searchError || !search) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
  }

  // Get results with properties
  const { data: results, error: resultsError } = await supabaseAdmin
    .from("search_results")
    .select("*, property:properties(*)")
    .eq("search_id", id);

  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }

  return NextResponse.json({ search, results });
}
