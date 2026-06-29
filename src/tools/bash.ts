import { exec } from "node:child_process";
import { promisify } from "node:util";
import { tool } from "ai";
import { z } from "zod";
import { logger } from "../logger.js";

const execAsync = promisify(exec);

function execBash(command: string): Promise<string> {
  logger.debug("bash", "exécution commande", { command: command.slice(0, 120) });
  return execAsync(command)
    .then(({ stdout, stderr }) => {
      logger.debug("bash", "commande terminée", {
        stdout_size: stdout.length,
        stderr_size: stderr.length,
      });
      let out = stdout;
      if (stderr) out += `\nstderr: ${stderr}`;
      out = out.trim();
      if (out.length > 1000) out = out.slice(0, 1000) + "\n... (tronqué)";
      return out;
    })
    .catch((error: any) => {
      logger.error("bash", "échec commande", { command: command.slice(0, 120), error: error.message });
      return `Erreur bash: ${error.message}`;
    });
}

export const bashTool = tool({
  description: "Exécuter une commande bash",
  parameters: z.object({
    command: z.string().describe("Commande bash à exécuter"),
  }),
  execute: async ({ command }: { command: string }) => {
    return await execBash(command);
  },
});
