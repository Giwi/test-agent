import { tool } from "ai";
import { z } from "zod";

export const serverHealthTool = tool({
  description: "Vérifier la santé d'un serveur",
  parameters: z.object({
    host: z.string().describe("Nom ou IP du serveur"),
  }),
  execute: async ({ host }: { host: string }) => {
    return JSON.stringify({ status: "ok", cpu: 45, ram: 62, disk: 78 });
  },
});
