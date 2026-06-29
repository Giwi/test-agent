import { serverHealthTool } from "./server-info.js";
import { telegramNotifyTool } from "./telegram-notify.js";
import { bashTool } from "./bash.js";
import { webSearchTool } from "./web-search.js";
import { webFetchTool } from "./web-fetch.js";

export const devOpsTools = [
  ["check_server_health", serverHealthTool] as const,
  ["telegram_notify", telegramNotifyTool] as const,
  ["run_bash_command", bashTool] as const,
  ["web_search", webSearchTool] as const,
  ["web_fetch", webFetchTool] as const,
];
