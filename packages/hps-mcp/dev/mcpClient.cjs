const { Client } = require("@modelcontextprotocol/sdk/client");
// Streamable HTTP client transport is not exported from the package root in CJS,
// so we import directly from the built path.
const {
  StreamableHTTPClientTransport,
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function main() {
  const serverUrl = process.env.MCP_URL || "http://localhost:8787/mcp";
  const token = process.env.HPS_MCP_HTTP_TOKEN || "hps-mcp-dev-secret-1";

  const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
    },
  });

  const client = new Client(
    { name: "hps-mcp-dev-client", version: "0.0.1" },
    {},
  );

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const summary =
      tools?.tools?.map((t) => ({
        name: t.name,
        description: t.description,
      })) || [];
    console.log("Tool list:", JSON.stringify(summary, null, 2));
  } finally {
    await transport.close();
  }
}

main().catch((err) => {
  console.error("Client error:", err);
  process.exit(1);
});
