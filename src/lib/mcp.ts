import { experimental_createMCPClient } from "ai";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { StdioTransport } from "./mcp-transport.js";

const clients: Awaited<ReturnType<typeof experimental_createMCPClient>>[] = [];

export async function initMcpServers(): Promise<Record<string, any>> {
  const cfg = loadConfig();
  const tools: Record<string, any> = {};

  if (!cfg.mcp?.servers) return tools;

  for (const [name, srv] of Object.entries(cfg.mcp.servers)) {
    try {
      let client: Awaited<ReturnType<typeof experimental_createMCPClient>>;
      if (srv.url) {
        logger.info("MCP", "connecting SSE", { name, url: srv.url });
        client = await experimental_createMCPClient({
          transport: { type: "sse", url: srv.url },
        });
      } else if (srv.command) {
        logger.info("MCP", "spawning stdio", { name, command: srv.command });
        const transport = new StdioTransport({ command: srv.command, args: srv.args, env: srv.env });
        client = await experimental_createMCPClient({ transport });
      } else {
        continue;
      }

      await client.init();
      const mcpTools = await client.tools();
      for (const [tName, tDef] of Object.entries(mcpTools)) {
        const params = (tDef as any).parameters ?? {};
        const paramStr = JSON.stringify(params).slice(0, 300);
        logger.info("MCP", `tool "${tName}"`, { parameters: paramStr });
      }
      Object.assign(tools, mcpTools);
      clients.push(client);
      logger.info("MCP", "ready", { name, toolCount: Object.keys(mcpTools).length });
    } catch (err: any) {
      logger.error("MCP", `failed to start "${name}"`, { error: err.message });
    }
  }

  return tools;
}

export async function shutdownMcpServers(): Promise<void> {
  for (const client of clients) {
    try { await client.close(); } catch { /* ignore */ }
  }
  clients.length = 0;
}
