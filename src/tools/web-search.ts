import { tool } from "ai";
import { z } from "zod";
import { loadConfig } from "../config.js";

export const webSearchTool = tool({
  description: "Rechercher sur le web (actualités, docs, correctifs, etc.)",
  parameters: z.object({
    query: z.string().describe("Termes de recherche"),
  }),
  execute: async ({ query }) => {
    const cfg = loadConfig();
    if (!cfg.langsearch.api_key) {
      return "Erreur: clé API LangSearch non configurée";
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);

    try {
      const res = await fetch("https://api.langsearch.com/v1/web-search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.langsearch.api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, summary: true, count: 5 }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        return `Erreur API LangSearch: ${res.status} ${res.statusText}`;
      }

      const json: any = await res.json();
      if (json.code !== 200 || !json.data?.webPages?.value?.length) {
        return "Aucun résultat";
      }

      return json.data.webPages.value
        .map(
          (p: any, i: number) =>
            `${i + 1}. ${p.name}\n   ${p.url}\n   ${p.summary || p.snippet || ""}`,
        )
        .join("\n\n");
    } catch (err: any) {
      if (err.name === "AbortError") return "Erreur: délai d'attente dépassé (15s)";
      return `Erreur: ${err.message}`;
    } finally {
      clearTimeout(timer);
    }
  },
});
