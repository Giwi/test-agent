type Level = "debug" | "info" | "warn" | "error";

const levels: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel: Level = (process.env.LOG_LEVEL as Level) ?? "info";

function log(level: Level, tag: string, msg: string, extra?: unknown) {
  if (levels[level] < levels[currentLevel]) return;
  const time = new Date().toISOString().slice(11, 23);
  const line = extra
    ? `[${time}] [${level.toUpperCase()}] [${tag}] ${msg} ${JSON.stringify(extra)}`
    : `[${time}] [${level.toUpperCase()}] [${tag}] ${msg}`;
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (tag: string, msg: string, extra?: unknown) => log("debug", tag, msg, extra),
  info: (tag: string, msg: string, extra?: unknown) => log("info", tag, msg, extra),
  warn: (tag: string, msg: string, extra?: unknown) => log("warn", tag, msg, extra),
  error: (tag: string, msg: string, extra?: unknown) => log("error", tag, msg, extra),
};
