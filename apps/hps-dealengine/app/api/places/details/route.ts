import { NextResponse } from "next/server";

const PLACES_DETAILS_BASE = "https://places.googleapis.com/v1/places";
const FIELD_MASK = ["formattedAddress", "addressComponents", "location"].join(",");

export async function POST(req: Request) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key is missing." }, { status: 500 });
  }

  let body: { placeId?: string } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    // ignore body parse errors
  }

  const placeId = body.placeId;
  if (!placeId) {
    return NextResponse.json({ error: "placeId is required." }, { status: 400 });
  }

  const url = `${PLACES_DETAILS_BASE}/${encodeURIComponent(placeId)}?fields=${FIELD_MASK}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to fetch place details." }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
