import { generateText, InvalidToolArgumentsError } from "ai";
import { ollama } from "ollama-ai-provider";
import type { CoreMessage } from "ai";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";

export class Agent {
  private tools: Record<string, any>;

  constructor(toolDefs: readonly (readonly [string, any])[]) {
    this.tools = Object.fromEntries(toolDefs);
  }

  async run(task: string) {
    const cfg = loadConfig();
    const messages: CoreMessage[] = [{ role: "user", content: task }];

    logger.info("OLLAMA", "début tâche", { task: task.slice(0, 80), model: cfg.ollama.model });

    for (let i = 0; i < 10; i++) {
      let result;
      try {
        logger.debug("OLLAMA", `appel LLM (itération ${i + 1})`);
        result = await generateText({
          model: ollama(cfg.ollama.model, {
            simulateStreaming: cfg.ollama.simulate_streaming,
          }) as any,
          tools: this.tools,
          maxSteps: 1,
          messages,
        });
      } catch (error) {
        if (error instanceof InvalidToolArgumentsError) {
          logger.warn("OLLAMA", "arguments outil invalides", {
            tool: error.toolName,
            args: error.toolArgs,
          });
          messages.push({
            role: "user",
            content: `L'appel à l'outil "${error.toolName}" a échoué: les arguments ${error.toolArgs} sont invalides. Corrige les paramètres requis.`,
          } as CoreMessage);
          continue;
        }
        logger.error("OLLAMA", "erreur appel LLM", { error: (error as Error).message });
        throw error;
      }

      logger.info("OLLAMA", `🏁 finishReason: ${result.finishReason}`);

      if (result.reasoning) {
        logger.info("OLLAMA", "🧠 raisonnement", { reasoning: result.reasoning });
      }
      if (result.text) {
        logger.info("OLLAMA", "💬 réponse texte", { text: result.text });
      }

      for (const call of result.toolCalls ?? []) {
        logger.info("OLLAMA", "🔧 appel outil", { tool: call.toolName, args: call.args });
      }

      for (const r of result.toolResults ?? []) {
        logger.info("OLLAMA", "✅ résultat outil", {
          tool: r.toolName,
          result: String(r.result).slice(0, 400),
        });
      }

      if (result.finishReason === "stop") {
        logger.info("OLLAMA", "tâche terminée");
        return result.text;
      }

      messages.push(...result.response.messages);
    }

    logger.warn("OLLAMA", "limite d'itérations atteinte");
    return "Limite d'itérations atteinte";
  }
}
