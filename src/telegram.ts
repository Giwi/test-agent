import { Telegraf } from "telegraf";
import { Agent } from "./agent.js";
import { devOpsTools } from "./tools/index.js";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";

let _bot: Telegraf | null = null;

function chatId(): number {
  const raw = loadConfig().telegram.chat_id;
  return typeof raw === "string" ? Number(raw) : raw;
}

function getBot(): Telegraf {
  if (!_bot) {
    const cfg = loadConfig();
    if (cfg.telegram.bot_token) {
      _bot = new Telegraf(cfg.telegram.bot_token, { handlerTimeout: 300_000 });
    }
  }
  return _bot!;
}

export async function sendTelegramMessage(text: string): Promise<string> {
  const cfg = loadConfig();
  const id = chatId();
  if (!cfg.telegram.bot_token || !id) {
    logger.info("TELEGRAM", "notification simulée (pas de token/chat_id)", { text });
    return "Notification (simulée): " + text;
  }
  try {
    const bot = getBot();
    await bot.telegram.sendMessage(id, text);
    logger.info("TELEGRAM", "notification envoyée", { length: text.length });
    return "Notification envoyée sur Telegram";
  } catch (err: any) {
    logger.error("TELEGRAM", "échec envoi notification", { error: err.message });
    return `Erreur Telegram: ${err.message}`;
  }
}

export async function startTelegramBot() {
  const cfg = loadConfig();
  const token = cfg.telegram.bot_token;
  if (!token) {
    logger.warn("TELEGRAM", "bot non démarré: token vide");
    return;
  }

  const bot = getBot();

  bot.catch((err) => {
    logger.error("TELEGRAM", "unhandled error", { error: (err as Error).message });
  });

  bot.on("text", async (ctx) => {
    const id = chatId();
    if (id && ctx.chat.id !== id) return;

    logger.info("TELEGRAM", "message reçu", {
      from: ctx.from?.username ?? ctx.from?.id,
      chat: ctx.chat.id,
      text: ctx.message.text,
    });

    try {
      const agent = new Agent(devOpsTools);
      const response = await agent.run(ctx.message.text);
      await ctx.reply(response);
      logger.info("TELEGRAM", "réponse envoyée", { length: response.length });
    } catch (err: any) {
      logger.error("TELEGRAM", "erreur traitement message", { error: err.message });
      await ctx.reply("Désolé, une erreur est survenue.");
    }
  });

  await bot.launch();
  logger.info("TELEGRAM", "bot démarré");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
