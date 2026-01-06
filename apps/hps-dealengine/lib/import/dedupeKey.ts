/**
 * Compute deterministic dedupe key from address components.
 * MUST match the server-side `compute_deal_dedupe_key()` function exactly.
 *
 * Algorithm:
 * 1. UPPER() + TRIM() all inputs
 * 2. Concatenate with pipe: STREET|CITY|STATE|ZIP5
 * 3. SHA256 hash as hex string
 */
export async function computeDedupeKey(
  street: string,
  city: string,
  state: string,
  zip: string
): Promise<string> {
  // Normalize exactly like the DB function
  const normalizedStreet = (street || "").trim().toUpperCase();
  const normalizedCity = (city || "").trim().toUpperCase();
  const normalizedState = (state || "").trim().toUpperCase();
  // Extract first 5 digits of ZIP
  const normalizedZip = (zip || "").replace(/[^\d]/g, "").slice(0, 5);

  // Concatenate with pipe delimiter
  const canonical = `${normalizedStreet}|${normalizedCity}|${normalizedState}|${normalizedZip}`;

  // SHA256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute dedupe key from a normalized row object
 */
export async function computeDedupeKeyFromRow(
  row: Record<string, string>
): Promise<string> {
  return computeDedupeKey(
    row.street || "",
    row.city || "",
    row.state || "",
    row.zip || ""
  );
}
