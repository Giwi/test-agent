import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Config {
  telegram: {
    bot_token: string;
    chat_id: number | string;
  };
  ollama: {
    model: string;
    simulate_streaming: boolean;
  };
}

let _config: Config | undefined;

export function loadConfig(): Config {
  if (_config) return _config;
  const path = resolve(__dirname, "..", "config.yml");
  const raw = readFileSync(path, "utf-8");
  _config = parse(raw) as Config;
  return _config;
}
