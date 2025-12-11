import { NegotiationMatrix } from "./matrix-types.ts";

let cachedMatrix: NegotiationMatrix | null = null;

function basicValidateMatrix(matrix: NegotiationMatrix) {
  if (!matrix || typeof matrix !== "object") throw new Error("Matrix not found or invalid JSON.");
  if (!Array.isArray(matrix.rows)) throw new Error("Matrix rows missing or not an array.");
}

export async function getNegotiationMatrix(): Promise<NegotiationMatrix> {
  if (cachedMatrix) return cachedMatrix;

  const url = new URL("../data/negotiation_logic_tree.json", import.meta.url);
  const raw = await Deno.readTextFile(url);
  const parsed = JSON.parse(raw) as NegotiationMatrix;

  basicValidateMatrix(parsed);
  cachedMatrix = parsed;
  return parsed;
}
