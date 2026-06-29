import { tool } from "ai";
import { z } from "zod";
import { loadConfig } from "../config.js";

export const webSearchTool = tool({
  description: "Search the web (news, docs, fixes, etc.)",
  parameters: z.object({
    query: z.string().describe("Search terms"),
  }),
  execute: async ({ query }) => {
    const cfg = loadConfig();
    if (!cfg.langsearch.api_key) {
      return "Error: LangSearch API key not configured";
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
        body: JSON.stringify({ query, summary: false, count: 3 }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        return `LangSearch API error: ${res.status} ${res.statusText}`;
      }

      const json: any = await res.json();
      if (json.code !== 200 || !json.data?.webPages?.value?.length) {
        return "No results";
      }

      return json.data.webPages.value
        .map(
          (p: any, i: number) =>
            `${i + 1}. ${p.name}\n   ${p.url}\n   ${p.summary || p.snippet || ""}`,
        )
        .join("\n\n");
    } catch (err: any) {
      if (err.name === "AbortError") return "Error: request timed out (15s)";
      return `Error: ${err.message}`;
    } finally {
      clearTimeout(timer);
    }
  },
});
