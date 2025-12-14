# HPS MCP – Remote HTTP Endpoint (Dev via ngrok)

## Local HTTP MCP Server

From the repo root:

```powershell
cd C:\Users\oziha\Documents\hps-dealengine
pnpm dev:hps-mcp:http
```

This starts the HTTP MCP server at:

- http://localhost:8787/mcp
- GET /health → {"ok":true,"server":"hps-mcp","mode":"http"}

Environment used (set your own token out-of-band):

- PORT=8787
- MCP_HTTP_PATH=/mcp
- HPS_MCP_HTTP_TOKEN=<your-generated-token>

## Public MCP Endpoint for Agent Builder (ngrok)

In a second terminal:

```powershell
cd C:\Users\oziha\Documents\hps-dealengine
pnpm dev:hps-mcp:tunnel
```

ngrok prints a line like:

- Forwarding  https://cristiano-unboring-chivalrously.ngrok-free.dev -> http://localhost:8787

Health check:

```powershell
curl https://cristiano-unboring-chivalrously.ngrok-free.dev/health
```

MCP endpoint for OpenAI Agent Builder:

- MCP URL: https://cristiano-unboring-chivalrously.ngrok-free.dev/mcp
- Auth header: Authorization: Bearer <your-generated-token>

## One-command dev (optional)

If you want both MCP HTTP + ngrok together:

```powershell
cd C:\Users\oziha\Documents\hps-dealengine
pnpm dev:hps-mcp:full
```

This runs both MCP HTTP server and ngrok tunnel together.
