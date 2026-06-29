import { tool } from "ai";
import { z } from "zod";

export const webFetchTool = tool({
  description: "Télécharger le contenu textuel d'une page web",
  parameters: z.object({
    url: z.string().url().describe("URL complète à récupérer"),
  }),
  execute: async ({ url }) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DevOpsAgent/1.0)" },
      });
      const text = await res.text();
      return text.slice(0, 8000);
    } catch (err: any) {
      if (err.name === "AbortError") return "Erreur: requête trop longue (15s)";
      return `Erreur fetch: ${err.message}`;
    } finally {
      clearTimeout(timer);
    }
  },
});
