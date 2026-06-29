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

    logger.info("OLLAMA", "starting task", { task: task.slice(0, 80), model: cfg.ollama.model });

    const responses: string[] = [];

    for (let i = 0; i < 10; i++) {
      let result;
      try {
        logger.debug("OLLAMA", `LLM call (iteration ${i + 1})`);
        result = await generateText({
          model: ollama(cfg.ollama.model, {
            simulateStreaming: cfg.ollama.simulate_streaming,
            numCtx: 8192,
          }) as any,
          tools: this.tools,
          maxSteps: 1,
          messages,
        });
      } catch (error) {
        if (error instanceof InvalidToolArgumentsError) {
          logger.warn("OLLAMA", "invalid tool arguments", {
            tool: error.toolName,
            args: error.toolArgs,
          });
          messages.push({
            role: "user",
            content: `Tool "${error.toolName}" call failed: arguments ${error.toolArgs} are invalid. Please correct the required parameters.`,
          } as CoreMessage);
          continue;
        }
        logger.error("OLLAMA", "LLM call error", { error: (error as Error).message });
        throw error;
      }

      logger.info("OLLAMA", `🏁 finishReason: ${result.finishReason}`);

      if (result.reasoning) {
        logger.info("OLLAMA", "🧠 reasoning", { reasoning: result.reasoning });
      }
      if (result.text) {
        responses.push(result.text);
        logger.info("OLLAMA", "💬 text response", { text: result.text });
      }

      for (const call of result.toolCalls ?? []) {
        logger.info("OLLAMA", "🔧 tool call", { tool: call.toolName, args: call.args });
      }

      for (const r of result.toolResults ?? []) {
        logger.info("OLLAMA", "✅ tool result", {
          tool: r.toolName,
          result: String(r.result).slice(0, 400),
        });
      }

      if (result.finishReason === "stop") {
        logger.info("OLLAMA", "task finished");
        return responses.join("\n\n---\n\n");
      }

      messages.push(...result.response.messages);
    }

    logger.warn("OLLAMA", "iteration limit reached");
    return "Iteration limit reached";
  }
}
