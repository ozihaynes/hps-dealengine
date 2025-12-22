import { NextResponse } from "next/server";

const PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";

export async function POST(req: Request) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key is missing." }, { status: 500 });
  }

  let body: { input?: string } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    // fall through with empty body
  }

  const input = body.input ?? "";
  if (!input || input.trim().length < 1) {
    return NextResponse.json({ suggestions: [] });
  }

  const response = await fetch(PLACES_AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input,
      languageCode: "en",
      includeQueryPredictions: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch autocomplete suggestions." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
