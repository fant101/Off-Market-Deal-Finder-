import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic";
import { buildOutreachPrompt } from "@/lib/prompts/outreach";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { VacantProperty } from "@/lib/types";

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

  try {
    const { property, tones } = await request.json() as {
      property: VacantProperty;
      tones: ("direct" | "soft" | "advisory")[];
    };

    if (!property) {
      return NextResponse.json({ error: "Property data is required" }, { status: 400 });
    }

    const selectedTones = tones || ["direct", "soft", "advisory"];

    // Generate all tones in parallel
    const promises = selectedTones.map(async (tone) => {
      const { system, user } = buildOutreachPrompt(property, tone);
      const response = await callClaude(system, user);
      return { tone, content: response };
    });

    const results = await Promise.allSettled(promises);
    const drafts = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<{ tone: string; content: string }>).value);

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error("Outreach generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate outreach. Please try again." },
      { status: 500 }
    );
  }
}
