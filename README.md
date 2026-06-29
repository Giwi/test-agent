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

# Edit the configuration file
# config.yml is already present — fill in your values
```

Configure `config.yml`:

```yaml
telegram:
  bot_token: "1234567890:ABCdef..."   # Telegram bot token
  chat_id: 123456789                   # allowed chat (optional, 0 = any)

ollama:
  model: "qwen2.5:7b"                  # Ollama model
  simulate_streaming: true

langsearch:
  api_key: "your-key"                  # https://langsearch.com/api-keys
```

Run the agent:

```bash
yarn start
```

## Available Tools

| Tool | Description |
|---|---|---|
| `check_server_health` | Simulate a server health check |
| `run_bash_command` | Execute a local bash command |
| `telegram_notify` | Send a notification via Telegram |
| `web_search` | Search the web (LangSearch API) |
| `web_fetch` | Fetch text content from a URL |
| `schedule_task` | Schedule a recurring cron task (Docker-style name) |
| `list_tasks` | List all scheduled tasks |
| `delete_task` | Remove a scheduled task by name |

## Prompt Samples

Send these to the Telegram bot:

| Prompt | What it does |
|---|---|
| `check le serveur example.com` | Simulate a health check |
| `exécute "ls -la /tmp" en bash` | Run a bash command |
| `cherche les dernières news sur Kubernetes` | Web search via LangSearch |
| `récupère le contenu de https://example.com` | Fetch a URL |
| `prévient moi que le déploiement est fini` | Send a Telegram notification |
| `programme un check serveur tous les jours à 9h avec le prompt "check le serveur web"` | Schedule a daily cron task |
| `liste les tâches programmées` | List scheduled tasks |
| `supprime la tâche happy_curie` | Delete a scheduled task |

## Logging

Logs include a component tag (`TELEGRAM`, `OLLAMA`, `SSH`) and a level (`INFO`, `DEBUG`, `WARN`, `ERROR`).

Verbosity control:

```bash
LOG_LEVEL=debug yarn start
```

## Configuration

All configuration lives in `config.yml` (gitignored).

The bot uses `handlerTimeout: 300_000` (5 min) in Telegraf to allow long LLM calls.

Environment variables:

- `LOG_LEVEL` — log level (`debug`, `info`, `warn`, `error` — default: `info`)
