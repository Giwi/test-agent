import { tool } from "ai";
import { z } from "zod";

async function fetchWithTimeout(url: string, timeoutMs = 15_000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export const webSearchTool = tool({
  description: "Rechercher sur le web (actualités, docs, correctifs, etc.)",
  parameters: z.object({
    query: z.string().describe("Termes de recherche"),
  }),
  execute: async ({ query }) => {
    const body = new URLSearchParams({ q: query });
    const html = await fetchWithTimeout(
      "https://html.duckduckgo.com/html/",
      15_000,
    ).catch(() => fetchWithTimeout(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
      10_000,
    ));

    if (html.startsWith("{")) {
      const data: any = JSON.parse(html);
      const lines: string[] = [];
      if (data.AbstractText) lines.push(data.AbstractText);
      if (data.Answer) lines.push(data.Answer);
      return lines.length ? lines.join("\n") : "Aucun résultat";
    }

    const results: string[] = [];
    let pos = 0;
    let n = 0;
    while (n < 5) {
      const a = html.indexOf('<a rel="nofollow" class="result__a" href="', pos);
      if (a === -1) break;
      const hrefStart = a + 45;
      const hrefEnd = html.indexOf('"', hrefStart);
      const href = html.slice(hrefStart, hrefEnd);

      const b = html.indexOf('class="result__snippet">', hrefEnd);
      if (b === -1) break;
      const textStart = b + 26;
      const textEnd = html.indexOf("</a>", textStart);
      const text = html.slice(textStart, textEnd).replace(/<[^>]+>/g, "").trim();

      results.push(`${text}\n  ${href.replace(/\/\/duckduckgo\.com\/l\/\?uddg=/, "")}`);
      pos = textEnd;
      n++;
    }

    return results.length ? results.join("\n\n") : "Aucun résultat";
  },
});
