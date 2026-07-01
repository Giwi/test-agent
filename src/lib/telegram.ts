import { Telegraf } from "telegraf";
import { Agent } from "./agent.js";
import { devOpsTools } from "../tools/index.js";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { scheduler } from "./scheduler.js";
import { initMcpServers, shutdownMcpServers } from "./mcp.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = resolve(__dirname, "..", ".telegram-state.json");

interface BotState {
  last_update_id: number;
  last_message_id: number;
}

let allTools: Record<string, any>;

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
    logger.info("TELEGRAM", "simulated notification (no token/chat_id)", { text });
    return "(Simulated) Notification: " + text;
  }
  try {
    const bot = getBot();
    await bot.telegram.sendMessage(id, text);
    logger.info("TELEGRAM", "notification sent", { length: text.length });
    return "Notification sent via Telegram";
  } catch (err: any) {
    logger.error("TELEGRAM", "notification send failed", { error: err.message });
    return `Telegram error: ${err.message}`;
  }
}

async function processMessage(text: string) {
  const agent = new Agent(allTools);
  const response = await agent.run(text);
  if (!response) {
    logger.info("TELEGRAM", "no text response");
    return;
  }
  const bot = getBot();
  await bot.telegram.sendMessage(chatId(), response);
  logger.info("TELEGRAM", "reply sent", { length: response.length });
}

export async function startTelegramBot() {
  const cfg = loadConfig();
  const token = cfg.telegram.bot_token;
  if (!token) {
    logger.warn("TELEGRAM", "bot not started: empty token");
    return;
  }

  const mcpTools = await initMcpServers();
  allTools = { ...Object.fromEntries(devOpsTools), ...mcpTools };

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

    logger.info("TELEGRAM", "message received", {
      from: ctx.from?.username ?? ctx.from?.id,
      chat: ctx.chat.id,
      text: ctx.message.text,
    });

    try {
      await processMessage(ctx.message.text);
    } catch (err: any) {
      logger.error("TELEGRAM", "message processing error", { error: err.message });
      await ctx.reply("Sorry, an error occurred.");
    }
  });

  scheduler.setRunner(async (prompt: string) => {
    const agent = new Agent(allTools);
    const response = await agent.run(prompt);
    if (response) {
      await sendTelegramMessage(`**Scheduled task**\n\n${response}`);
    }
    return response;
  });

  await bot.launch({
    allowedUpdates: ["message"],
  });
  logger.info("TELEGRAM", "bot started");

  process.once("SIGINT", async () => { await shutdownMcpServers(); bot.stop("SIGINT"); });
  process.once("SIGTERM", async () => { await shutdownMcpServers(); bot.stop("SIGTERM"); });
}
