import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { server } from "./server";
import cors from "cors";

function getEnv(key: string, fallback?: string) {
  const val = process.env[key];
  return val && val.trim().length > 0 ? val.trim() : fallback;
}

function authMiddleware(expectedToken: string | undefined) {
  return (req: any, res: any, next: any) => {
    if (!expectedToken) return next();
    const header = req.headers?.authorization || req.headers?.Authorization;
    if (typeof header !== "string") {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    const [scheme, token] = header.split(" ");
    if (!scheme || !token || scheme.toLowerCase() !== "bearer" || token.trim() !== expectedToken) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    next();
  };
}

// Optional auth for manifest (GET /mcp): allow missing token, but if provided and wrong, 401.
function optionalAuthMiddleware(expectedToken: string | undefined) {
  return (req: any, res: any, next: any) => {
    if (!expectedToken) return next();
    const header = req.headers?.authorization || req.headers?.Authorization;
    if (!header) return next();
    const [scheme, token] = header.split(" ");
    if (!scheme || !token || scheme.toLowerCase() !== "bearer" || token.trim() !== expectedToken) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    next();
  };
}

export async function startHttpServer() {
  const port = Number(getEnv("PORT", "8787"));
  const host = getEnv("HOST", "0.0.0.0");
  const path = getEnv("MCP_HTTP_PATH", "/mcp");
  const sharedToken = getEnv("HPS_MCP_HTTP_TOKEN");

  const app = createMcpExpressApp({ host });
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Authorization", "Content-Type", "Accept"],
    }),
  );
  app.use((req: any, res: any, next: any) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await server.connect(transport);

  // Simple discovery/keep-alive for MCP path
  app.get(path, optionalAuthMiddleware(sharedToken), (_req: any, res: any) => {
    res.json({
      protocolVersion: "2024-11-05",
      serverInfo: {
        name: "hps-mcp",
        version: "1.0.0",
      },
      capabilities: {
        tools: {},
        resources: {},
      },
    });
  });

  // OPTIONS for preflight/tooling that probes the MCP endpoint
  app.options(path, authMiddleware(sharedToken), (_req: any, res: any) => {
    res.set("Allow", "GET,POST,OPTIONS");
    res.status(204).end();
  });

  // Main MCP transport (expects POST)
  app.post(path, authMiddleware(sharedToken), async (req: any, res: any) => {
    try {
      const acceptHeader =
        typeof req.headers?.accept === "string" ? req.headers.accept : "";
      const parts = acceptHeader
        .split(",")
        .map((p: string) => p.trim().toLowerCase())
        .filter(Boolean);
      for (const required of ["application/json", "text/event-stream"]) {
        if (!parts.includes(required)) parts.push(required);
      }
      req.headers.accept = parts.join(", ");
      // If this is an initialize request, allow re-initialization by resetting state
      const body = req.body;
      const isInitialize =
        (Array.isArray(body) && body.some((m) => m?.method === "initialize")) ||
        (!Array.isArray(body) && body?.method === "initialize");
      if (isInitialize) {
        (transport as any)._initialized = false;
        (transport as any).sessionId = undefined;
      }
      await transport.handleRequest(req, res, req.body);
    } catch (err: any) {
      console.error("[hps-mcp:http] request handling failed", err?.message ?? err);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, error: "internal_error" });
      }
    }
  });

  app.get("/health", (_req: any, res: any) => {
    res.json({ ok: true, server: "hps-mcp", mode: "http" });
  });

  app.listen(port, host, () => {
    console.info(`[hps-mcp] HTTP server listening on http://${host}:${port}${path}`);
  });
}

// Start immediately when executed directly
startHttpServer().catch((err) => {
  console.error("[hps-mcp:http] failed to start", err);
  process.exit(1);
});
