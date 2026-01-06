const STORAGE_KEY = "hps-dealengine:last-session";

export interface LastSessionState {
  dealId: string;
  pathname: string;
}

export function saveLastSession(state: LastSessionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // best-effort; ignore storage failures
  }
}

export function loadLastSession(): LastSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.dealId !== "string" ||
      typeof parsed.pathname !== "string"
    ) {
      return null;
    }
    return parsed as LastSessionState;
  } catch {
    return null;
  }
}

export function clearLastSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
