const COOKIE_NAME = "hps_request_id";

export function getRequestIdFromCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const entry of cookies) {
    if (!entry) continue;
    const [key, ...rest] = entry.split("=");
    if (key === COOKIE_NAME) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}
