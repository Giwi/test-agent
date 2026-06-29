import { exec } from "node:child_process";
import { promisify } from "node:util";
import { tool } from "ai";
import { z } from "zod";
import { logger } from "../lib/logger.js";

const execAsync = promisify(exec);

function execBash(command: string): Promise<string> {
  logger.debug("bash", "running command", { command: command.slice(0, 120) });
  return execAsync(command)
    .then(({ stdout, stderr }) => {
      logger.debug("bash", "command done", {
        stdout_size: stdout.length,
        stderr_size: stderr.length,
      });
      let out = stdout;
      if (stderr) out += `\nstderr: ${stderr}`;
      out = out.trim();
      if (out.length > 1000) out = out.slice(0, 1000) + "\n... (truncated)";
      return out;
    })
    .catch((error: any) => {
      logger.error("bash", "command failed", { command: command.slice(0, 120), error: error.message });
      return `Bash error: ${error.message}`;
    });
}

export const bashTool = tool({
  description: "Run a bash command",
  parameters: z.object({
    command: z.string().describe("Bash command to execute"),
  }),
  execute: async ({ command }: { command: string }) => {
    return await execBash(command);
  },
});
