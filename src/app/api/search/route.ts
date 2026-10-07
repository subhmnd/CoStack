import { NextRequest, NextResponse } from "next/server";

export interface SearchResultItem {
  id: string;
  name: string;
  version: string;
  versions: string[];
  source: string;
  sourceUrl: string;
  category: "panel" | "webserver" | "database" | "cache" | "runtime" | "os" | "application";
}

const searchCache = new Map<string, { data: SearchResultItem[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 mins cache

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() || "";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = query.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ results: cached.data });
  }

  const results: SearchResultItem[] = [];
  const seenDomains = new Set<string>();

  const addResult = (
    name: string,
    domain: string,
    url: string,
    foundVersion = "latest"
  ) => {
    const cleanDomain = domain.toLowerCase().replace(/^www\./, "");
    if (!cleanDomain || seenDomains.has(cleanDomain)) return;
    seenDomains.add(cleanDomain);

    const lower = `${name} ${cleanDomain}`.toLowerCase();
    let category: SearchResultItem["category"] = "application";
    if (lower.includes("panel") || lower.includes("hosting")) {
      category = "panel";
    } else if (lower.includes("server") || lower.includes("proxy")) {
      category = "webserver";
    } else if (lower.includes("database") || lower.includes("sql") || lower.includes("postgres")) {
      category = "database";
    }

    const versions = Array.from(new Set([foundVersion, "latest", "stable"]));

    results.push({
      id: cleanDomain.replace(/[^a-z0-9]/gi, "-"),
      name,
      version: foundVersion,
      versions,
      source: cleanDomain,
      sourceUrl: url,
      category,
    });
  };

  // 1. DuckDuckGo Web Search with clean native headers
  try {
    const res = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
      },
      body: `q=${encodeURIComponent(query)}`,
    });

    if (res.ok) {
      const html = await res.text();
      const regex =
        /<a rel="nofollow" href="([^"]+)" class=.result-link.>([\s\S]*?)<\/a>/g;
      let match;

      while ((match = regex.exec(html)) !== null && results.length < 5) {
        const rawUrl = match[1];
        if (
          rawUrl.includes("/y.js?") ||
          rawUrl.includes("aclick") ||
          rawUrl.includes("duckduckgo.com")
        ) {
          continue;
        }

        const rawTitle = match[2]
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&#x27;/g, "'")
          .trim();

        let domain = "";
        try {
          domain = new URL(rawUrl).hostname;
        } catch {
          continue;
        }

        if (
          !domain ||
          domain.includes("duckduckgo.com") ||
          domain.includes("google.") ||
          domain.includes("bing.")
        ) {
          continue;
        }

        // Clean software name from title
        let cleanName = rawTitle.split(/[|\-–:]/)[0].trim();
        if (
          cleanName.length > 25 ||
          cleanName.toLowerCase().includes("home") ||
          cleanName.toLowerCase().includes("official")
        ) {
          const parts = rawTitle.split(/[|\-–:]/).map((p) => p.trim());
          const matchPart = parts.find((p) =>
            p.toLowerCase().includes(query.toLowerCase())
          );
          cleanName = matchPart || cleanName;
        }

        const versionMatch = rawTitle.match(/v?(\d+\.\d+(\.\d+)?)/);
        const parsedVersion = versionMatch ? versionMatch[1] : "latest";

        addResult(cleanName, domain, rawUrl, parsedVersion);
      }
    }
  } catch (err) {
    console.error("DDG web search error:", err);
  }

  // 2. Google Direct Suggestion for queries with navigation URLs (e.g. typos)
  if (results.length === 0) {
    try {
      const gUrl = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;
      const gRes = await fetch(gUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          Accept: "*/*",
        },
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const suggestions: string[] = gData[1] || [];
        const descriptions: string[] = gData[2] || [];

        for (let i = 0; i < suggestions.length; i++) {
          const s = suggestions[i];
          if (s.startsWith("http://") || s.startsWith("https://")) {
            let domain = "";
            try {
              domain = new URL(s).hostname;
            } catch {
              continue;
            }

            const desc = descriptions[i] || "";
            let name = desc ? desc.split(/[|\-–:]/)[0].trim() : suggestions[0] || query;
            if (name.length > 25) name = suggestions[0] || query;

            addResult(name, domain, s);
          }
        }
      }
    } catch (err) {
      console.error("Google Suggest error:", err);
    }
  }

  searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
  return NextResponse.json({ results });
}
