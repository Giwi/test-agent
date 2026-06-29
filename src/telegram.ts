import { Telegraf } from "telegraf";
import { Agent } from "./agent.js";
import { devOpsTools } from "./tools/index.js";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = resolve(__dirname, "..", ".telegram-state.json");

interface BotState {
  last_update_id: number;
  last_message_id: number;
}

function loadState(): BotState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return { last_update_id: 0, last_message_id: 0 };
}

function saveState(state: BotState) {
  writeFileSync(STATE_FILE, JSON.stringify(state));
}

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

async function processMessage(text: string) {
  const agent = new Agent(devOpsTools);
  const response = await agent.run(text);
  if (!response) {
    logger.info("TELEGRAM", "pas de réponse textuelle");
    return;
  }
  const bot = getBot();
  await bot.telegram.sendMessage(chatId(), response);
  logger.info("TELEGRAM", "réponse envoyée", { length: response.length });
}

export async function startTelegramBot() {
  const cfg = loadConfig();
  const token = cfg.telegram.bot_token;
  if (!token) {
    logger.warn("TELEGRAM", "bot non démarré: token vide");
    return;
  }

  const state = loadState();
  const bot = getBot();

  bot.catch((err) => {
    logger.error("TELEGRAM", "unhandled error", { error: (err as Error).message });
  });

  bot.on("text", async (ctx) => {
    const id = chatId();
    if (id && ctx.chat.id !== id) return;

    if (ctx.message.message_id <= state.last_message_id) return;

    state.last_update_id = ctx.update.update_id;
    state.last_message_id = ctx.message.message_id;
    saveState(state);

    logger.info("TELEGRAM", "message reçu", {
      from: ctx.from?.username ?? ctx.from?.id,
      chat: ctx.chat.id,
      text: ctx.message.text,
    });

    try {
      await processMessage(ctx.message.text);
    } catch (err: any) {
      logger.error("TELEGRAM", "erreur traitement message", { error: err.message });
      await ctx.reply("Désolé, une erreur est survenue.");
    }
  });

  await bot.launch({
    allowedUpdates: ["message"],
  });
  logger.info("TELEGRAM", "bot démarré");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
