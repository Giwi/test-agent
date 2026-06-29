import { tool } from "ai";
import { z } from "zod";
import { scheduler } from "../scheduler.js";

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
  description: "Lister toutes les tâches programmées avec leur nom, description et cron.",
  parameters: z.object({}),
  execute: async () => {
    const tasks = scheduler.list();
    if (tasks.length === 0) return "Aucune tâche programmée.";
    return tasks
      .map(
        (t) =>
          `- **${t.name}** : ${t.description}\n  Cron: \`${t.cron}\`, prochaine exécution: ${t.nextRun ?? "inconnue"}`,
      )
      .join("\n");
  },
});

export const deleteTaskTool = tool({
  description: "Supprimer (arrêter) une tâche programmée par son nom.",
  parameters: z.object({
    name: z.string().describe("Nom de la tâche à supprimer (ex: happy_curie)"),
  }),
  execute: async ({ name }) => {
    const ok = scheduler.remove(name);
    if (ok) return `Tâche "${name}" supprimée.`;
    return `Aucune tâche trouvée avec le nom "${name}". Utilise l'outil list_tasks pour voir les tâches existantes.`;
  },
});
