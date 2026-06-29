import { loadConfig } from "./config.js";
import { startTelegramBot } from "./telegram.js";

loadConfig();
await startTelegramBot();
