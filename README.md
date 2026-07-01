# test-agent

LLM-driven DevOps agent (Ollama) that listens to Telegram messages and executes actions via tools.

## Stack

- **[Ollama](https://ollama.com/)** — local LLM model (`llama3.2:3b`, `qwen2.5:7b`, etc.)
- **[Vercel AI SDK](https://sdk.vercel.ai/)** (`ai@4`) — LLM call orchestration and tool calling (max 1 step, manual 10-iteration loop)
- **[Telegraf](https://telegraf.js.org/)** — Telegram client (receive + send messages)
- **[tsx](https://tsx.is/)** — TypeScript execution without build step

## Getting Started

```bash
# Install dependencies
yarn

# Edit config.yml with your Telegram token, Ollama model, etc.
```

Run the agent:

```bash
yarn start
```

## Available Tools

| Tool | Description |
|---|---|
| `run_bash_command` | Execute a local bash command |
| `telegram_notify` | Send a notification via Telegram |
| `web_search` | Search the web (LangSearch API) |
| `web_fetch` | Fetch text content from a URL |
| `schedule_task` | Schedule a recurring cron task (Docker-style name) |
| `list_tasks` | List all scheduled tasks |
| `delete_task` | Remove a scheduled task by name |

MCP servers defined in `config.yml` are loaded at startup and merged as additional tools (e.g., weather lookup).

## Prompt Samples

Send these to the Telegram bot:

| Prompt | What it does |
|---|---|
| `run ls -la /tmp` | Run a bash command |
| `search for latest Kubernetes news` | Web search via LangSearch |
| `fetch https://example.com` | Fetch a URL |
| `notify me that the deployment is done` | Send a Telegram notification |
| `schedule a server check daily at 9am` | Schedule a daily cron task |
| `list scheduled tasks` | List scheduled tasks |
| `delete task happy_curie` | Delete a scheduled task |
| `what is the weather in Paris?` | Weather via MCP (if configured) |

## Logging

Logs include a component tag (`TELEGRAM`, `OLLAMA`, `MCP`) and a level (`INFO`, `DEBUG`, `WARN`, `ERROR`).

Verbosity control:

```bash
LOG_LEVEL=debug yarn start
```

## Configuration

All configuration lives in `config.yml` (gitignored).

```yaml
telegram:
  bot_token: "..."    # Telegram bot token
  chat_id: 123456789  # allowed chat (optional)

ollama:
  model: "qwen2.5:7b"
  simulate_streaming: true

langsearch:
  api_key: "sk-..."   # https://langsearch.com/api-keys

mcp:
  servers:
    weather:
      command: npx
      args: ["-y", "@swonixs/weatherapi-mcp"]
      env:
        WEATHER_API_KEY: "your-key"
```

MCP servers use Claude Desktop config format — auto-detected: `url` → SSE transport, `command` → stdio transport.

The bot uses `handlerTimeout: 300_000` (5 min) in Telegraf to allow long LLM calls.

Environment variables:

- `LOG_LEVEL` — log level (`debug`, `info`, `warn`, `error` — default: `info`)

## MCP Compatibility

See `AGENTS.md` for notes on MCP server compatibility with Ollama `qwen2.5:7b`. Servers with long descriptions or complex parameter schemas may crash the model runner.
