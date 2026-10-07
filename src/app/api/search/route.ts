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

  // Helper to add clean result
  const addResult = (
    name: string,
    domain: string,
    url: string,
    categoryHint = "application",
    foundVersion = "latest"
  ) => {
    const cleanDomain = domain.toLowerCase().replace(/^www\./, "");
    if (!cleanDomain || seenDomains.has(cleanDomain)) return;
    seenDomains.add(cleanDomain);

    const lower = `${name} ${cleanDomain}`.toLowerCase();
    let category: SearchResultItem["category"] = "application";
    if (lower.includes("panel") || lower.includes("hosting") || categoryHint === "panel") {
      category = "panel";
    } else if (lower.includes("server") || lower.includes("proxy") || categoryHint === "webserver") {
      category = "webserver";
    } else if (lower.includes("database") || lower.includes("sql") || lower.includes("postgres") || categoryHint === "database") {
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

  // 1. DuckDuckGo Web Search
  try {
    const res = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Origin: "https://lite.duckduckgo.com",
        Referer: "https://lite.duckduckgo.com/",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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
        if (rawUrl.includes("/y.js?") || rawUrl.includes("aclick") || rawUrl.includes("duckduckgo.com")) {
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

        if (!domain || domain.includes("google.") || domain.includes("bing.")) continue;

        // Clean software name
        let cleanName = rawTitle.split(/[|\-–:]/)[0].trim();
        if (cleanName.length > 25 || cleanName.toLowerCase().includes("home") || cleanName.toLowerCase().includes("official")) {
          const parts = rawTitle.split(/[|\-–:]/).map((p) => p.trim());
          const matchPart = parts.find((p) => p.toLowerCase().includes(query.toLowerCase()));
          cleanName = matchPart || cleanName;
        }

        const versionMatch = rawTitle.match(/v?(\d+\.\d+(\.\d+)?)/);
        const parsedVersion = versionMatch ? versionMatch[1] : "latest";

        addResult(cleanName, domain, rawUrl, "application", parsedVersion);
      }
    }
  } catch (err) {
    console.error("DDG search error:", err);
  }

  // 2. Google Direct Search Suggestion with Navigation URLs (handles typos like "postgress" -> "postgresql.org")
  if (results.length === 0) {
    try {
      const gUrl = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;
      const gRes = await fetch(gUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

  // 3. Wikipedia & Wikidata Knowledge Graph Resolver (official homepages & versions)
  if (results.length === 0) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&namespace=0&format=json`;
      const wikiRes = await fetch(wikiUrl, {
        headers: { "User-Agent": "CoStack-Search/1.0 (contact@costack.dev)" },
      });

      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const titles: string[] = wikiData[1] || [];
        const urls: string[] = wikiData[3] || [];

        for (let i = 0; i < Math.min(titles.length, 2); i++) {
          const title = titles[i];
          const articleUrl = urls[i] || "";

          // Fetch Wikidata official website property P856
          try {
            const wdUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(title)}&props=claims&format=json`;
            const wdRes = await fetch(wdUrl, {
              headers: { "User-Agent": "CoStack-Search/1.0 (contact@costack.dev)" },
            });
            if (wdRes.ok) {
              const wdData = await wdRes.json();
              const entities = wdData.entities || {};
              const firstId = Object.keys(entities)[0];
              const claims = entities[firstId]?.claims || {};
              const officialUrl = claims.P856?.[0]?.mainsnak?.datavalue?.value;

              if (officialUrl) {
                const domain = new URL(officialUrl).hostname;
                const versionClaims = claims.P348 || [];
                const foundVer =
                  versionClaims[0]?.mainsnak?.datavalue?.value || "latest";
                addResult(title, domain, officialUrl, "application", foundVer);
                continue;
              }
            }
          } catch {
            // continue
          }

          // Fallback to Wikipedia domain
          addResult(title, "wikipedia.org", articleUrl);
        }
      }
    } catch (err) {
      console.error("Wikipedia search error:", err);
    }
  }

  searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
  return NextResponse.json({ results });
}
