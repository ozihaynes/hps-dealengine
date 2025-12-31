// apps/hps-dealengine/instrumentation.ts
// Next.js instrumentation entrypoint for vendor-agnostic OTel setup.

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { registerOTel } = await import("@vercel/otel");
  registerOTel({ serviceName: "hps-dealengine" });
}
