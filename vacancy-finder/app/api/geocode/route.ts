import { NextRequest, NextResponse } from "next/server";
import { batchGeocode } from "@/lib/geocode";

export async function POST(request: NextRequest) {
  try {
    const { addresses } = await request.json();

    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: "addresses array is required" },
        { status: 400 }
      );
    }

    const results = await batchGeocode(addresses);
    const output: Record<string, { lat: number; lng: number; formattedAddress: string }> = {};
    results.forEach((val, key) => {
      output[key] = val;
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error("Geocoding failed:", error);
    return NextResponse.json(
      { error: "Geocoding failed" },
      { status: 500 }
    );
  }
}
