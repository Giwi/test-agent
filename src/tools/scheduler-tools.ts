import { tool } from "ai";
import { z } from "zod";
import { scheduler } from "../lib/scheduler.js";

export const scheduleTaskTool = tool({
  description: "Schedule a recurring task with a cron expression. Returns the randomly generated name.",
  parameters: z.object({
    cron: z.string().describe("Cron expression (e.g. '0 9 * * *' for daily at 9am)"),
    prompt: z.string().describe("Detailed prompt for the agent at execution time"),
    description: z.string().describe("Human-readable description of what the task does"),
  }),
  execute: async ({ cron, prompt, description }) => {
    const name = scheduler.add(cron, prompt, description);
    return `Scheduled task: **${name}**\nCron: \`${cron}\`\nDescription: ${description}`;
  },
});

export const listTasksTool = tool({
  description: "List all scheduled tasks with their name, description and cron.",
  parameters: z.object({}),
  execute: async () => {
    const tasks = scheduler.list();
    if (tasks.length === 0) return "No scheduled tasks.";
    return tasks
      .map(
        (t) =>
          `- **${t.name}** : ${t.description}\n  Cron: \`${t.cron}\`, next execution: ${t.nextRun ?? "unknown"}`,
      )
      .join("\n");
  },
});

export const deleteTaskTool = tool({
  description: "Delete (stop) a scheduled task by its name.",
  parameters: z.object({
    name: z.string().describe("Name of the task to delete (e.g. happy_curie)"),
  }),
  execute: async ({ name }) => {
    const ok = scheduler.remove(name);
    if (ok) return `Task "${name}" deleted.`;
    return `No task found with the name "${name}". Use the list_tasks tool to see existing tasks.`;
  },
});
