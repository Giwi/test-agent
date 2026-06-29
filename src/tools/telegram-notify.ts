import { tool } from "ai";
import { z } from "zod";
import { sendTelegramMessage } from "../telegram.js";

export const telegramNotifyTool = tool({
  description: "Send a Telegram notification",
  parameters: z.object({
    message: z.string().describe("The message to send"),
  }),
  execute: async ({ message }: { message: string }) => {
    return await sendTelegramMessage(message);
  },
});
