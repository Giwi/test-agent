import { loadConfig } from "./lib/config.js";
import { startTelegramBot } from "./lib/telegram.js";

loadConfig();
await startTelegramBot();
