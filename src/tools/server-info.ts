import { tool } from "ai";
import { z } from "zod";

export const serverHealthTool = tool({
  description: "Check server health",
  parameters: z.object({
    host: z.string().describe("Server name or IP"),
  }),
  execute: async ({ host }: { host: string }) => {
    return JSON.stringify({ status: "ok", cpu: 45, ram: 62, disk: 78 });
  },
});
