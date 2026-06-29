import { tool } from "ai";
import { z } from "zod";
import { sendTelegramMessage } from "../telegram.js";

export const telegramNotifyTool = tool({
  description: "Envoyer une notification sur Telegram",
  parameters: z.object({
    message: z.string().describe("Le message à envoyer"),
  }),
  execute: async ({ message }: { message: string }) => {
    return await sendTelegramMessage(message);
  },
});
