export type CalibrationFreezeRow = {
  is_frozen?: boolean | null;
  reason?: string | null;
};

export type CalibrationFreezeDecision =
  | { frozen: true; reason: string }
  | { frozen: false };

export function resolveCalibrationFreezeDecision(
  marketKey: string,
  row: CalibrationFreezeRow | null,
): CalibrationFreezeDecision {
  if (!row || row.is_frozen !== true) return { frozen: false };

  const reason =
    typeof row.reason === "string" && row.reason.trim().length > 0
      ? row.reason.trim()
      : marketKey;

  return { frozen: true, reason: `frozen:${reason}` };
}
