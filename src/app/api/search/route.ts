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
const CACHE_TTL = 1000 * 60 * 30; // 30 mins

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

  try {
    // Pure Web Search without any 3rd party API key or developer API
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
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const html = await res.text();
      const regex =
        /<a rel="nofollow" href="([^"]+)" class=.result-link.>([\s\S]*?)<\/a>/g;
      let match;

      while ((match = regex.exec(html)) !== null && results.length < 5) {
        const rawUrl = match[1];
        const rawTitle = match[2]
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&#x27;/g, "'")
          .trim();

        let domain = "";
        try {
          domain = new URL(rawUrl).hostname.replace(/^www\./, "");
        } catch {
          continue;
        }

        // Avoid search engines, ads or generic trackers
        if (
          !domain ||
          domain.includes("duckduckgo.com") ||
          domain.includes("google.") ||
          domain.includes("bing.") ||
          seenDomains.has(domain)
        ) {
          continue;
        }

        seenDomains.add(domain);

        // Clean software name from web title
        let cleanName = rawTitle.split(/[|\-–:]/)[0].trim();
        if (cleanName.length > 30 || cleanName.toLowerCase().includes("home") || cleanName.toLowerCase().includes("official")) {
          const parts = rawTitle.split(/[|\-–:]/).map((p) => p.trim());
          const matchPart = parts.find((p) => p.toLowerCase().includes(query.toLowerCase()));
          cleanName = matchPart || query.charAt(0).toUpperCase() + query.slice(1);
        }

        // Generic classification without any hardcoded software names
        const lowerText = `${rawTitle} ${domain}`.toLowerCase();
        let category: SearchResultItem["category"] = "application";
        if (lowerText.includes("panel") || lowerText.includes("hosting")) {
          category = "panel";
        } else if (lowerText.includes("server") || lowerText.includes("proxy")) {
          category = "webserver";
        } else if (lowerText.includes("database") || lowerText.includes("sql")) {
          category = "database";
        }

        // Extract version from web search title/snippet if present
        const versionMatch = rawTitle.match(/v?(\d+\.\d+(\.\d+)?)/);
        const parsedVersion = versionMatch ? versionMatch[1] : "latest";
        const versions = Array.from(
          new Set([parsedVersion, "latest", "stable"])
        );

        results.push({
          id: domain.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
          name: cleanName || query,
          version: parsedVersion,
          versions,
          source: domain,
          sourceUrl: rawUrl,
          category,
        });
      }
    }
  } catch (err) {
    console.error("Web search error:", err);
  }

  // Pure dynamic fallback if web search yielded 0 items
  if (results.length === 0) {
    const cleanSlug = query.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const isPanel = cleanSlug.includes("panel") || cleanSlug.includes("cpanel");
    const isWeb = cleanSlug.includes("nginx") || cleanSlug.includes("apache") || cleanSlug.includes("web");
    const isDb = cleanSlug.includes("sql") || cleanSlug.includes("db");

    results.push({
      id: cleanSlug,
      name: query.charAt(0).toUpperCase() + query.slice(1),
      version: "latest",
      versions: ["latest", "stable"],
      source: `${cleanSlug}.org`,
      sourceUrl: `https://${cleanSlug}.org`,
      category: isPanel ? "panel" : isWeb ? "webserver" : isDb ? "database" : "application",
    });
  }

  searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
  return NextResponse.json({ results });
}
