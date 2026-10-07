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

  const addResult = (
    name: string,
    domain: string,
    url: string,
    foundVersion = "latest"
  ) => {
    let cleanDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[›/\s]/)[0]
      .trim();

    if (!cleanDomain || seenDomains.has(cleanDomain)) return;
    if (
      cleanDomain.includes("google.") ||
      cleanDomain.includes("bing.") ||
      cleanDomain.includes("duckduckgo.")
    ) {
      return;
    }
    seenDomains.add(cleanDomain);

    const lower = `${name} ${cleanDomain}`.toLowerCase();
    let category: SearchResultItem["category"] = "application";
    if (lower.includes("panel") || lower.includes("hosting")) {
      category = "panel";
    } else if (
      lower.includes("server") ||
      lower.includes("proxy") ||
      lower.includes("nginx") ||
      lower.includes("apache")
    ) {
      category = "webserver";
    } else if (
      lower.includes("database") ||
      lower.includes("sql") ||
      lower.includes("postgres") ||
      lower.includes("redis")
    ) {
      category = "database";
    }

    const versions = Array.from(new Set([foundVersion, "latest", "stable", "lts"]));

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

  // Run Bing Web Search and DuckDuckGo Lite concurrently for maximum resilience & speed
  const fetchBing = async () => {
    try {
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en&mkt=en-US`;
      const res = await fetch(bingUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!res.ok) return;
      const html = await res.text();
      const algos = html.match(/<li class="b_algo"[\s\S]*?<\/li>/g) || [];

      for (const item of algos.slice(0, 8)) {
        const titleMatch = item.match(/<h2[^>]*><a[^>]*>([\s\S]*?)<\/a><\/h2>/);
        const domainMatch =
          item.match(/<div class="tptt">([^<]+)<\/div>/) ||
          item.match(/<cite[^>]*>([\s\S]*?)<\/cite>/) ||
          item.match(/aria-label="([^"]+)"/);

        if (titleMatch && domainMatch) {
          const rawTitle = titleMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
          const rawDomain = domainMatch[1].replace(/<[^>]+>/g, "").trim();

          let cleanName = rawTitle.split(/[|\-:–]/)[0].trim();
          if (
            cleanName.length > 25 ||
            cleanName.toLowerCase().includes("home") ||
            cleanName.toLowerCase().includes("official")
          ) {
            const parts = rawTitle.split(/[|\-:–]/).map((p) => p.trim());
            const matchPart = parts.find((p) => p.toLowerCase().includes(query.toLowerCase()));
            cleanName = matchPart || cleanName;
          }

          const versionMatch = rawTitle.match(/v?(\d+\.\d+(\.\d+)?)/);
          const parsedVersion = versionMatch ? versionMatch[1] : "latest";

          addResult(cleanName, rawDomain, `https://${rawDomain}`, parsedVersion);
        }
      }
    } catch (err) {
      console.error("Bing search error:", err);
    }
  };

  const fetchDDG = async () => {
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

      if (!res.ok) return;
      const html = await res.text();
      const regex = /<a rel="nofollow" href="([^"]+)" class=.result-link.>([\s\S]*?)<\/a>/g;
      let match;

      while ((match = regex.exec(html)) !== null && results.length < 8) {
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

        let cleanName = rawTitle.split(/[|\-:–]/)[0].trim();
        if (
          cleanName.length > 25 ||
          cleanName.toLowerCase().includes("home") ||
          cleanName.toLowerCase().includes("official")
        ) {
          const parts = rawTitle.split(/[|\-:–]/).map((p) => p.trim());
          const matchPart = parts.find((p) => p.toLowerCase().includes(query.toLowerCase()));
          cleanName = matchPart || cleanName;
        }

        const versionMatch = rawTitle.match(/v?(\d+\.\d+(\.\d+)?)/);
        const parsedVersion = versionMatch ? versionMatch[1] : "latest";

        addResult(cleanName, domain, rawUrl, parsedVersion);
      }
    } catch (err) {
      console.error("DDG search error:", err);
    }
  };

  await Promise.allSettled([fetchBing(), fetchDDG()]);

  // Fallback: Wikipedia OpenSearch if search engines return 0 results
  if (results.length === 0) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`;
      const wikiRes = await fetch(wikiUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const titles: string[] = wikiData[1] || [];
        const urls: string[] = wikiData[3] || [];
        for (let i = 0; i < titles.length; i++) {
          const title = titles[i];
          const articleUrl = urls[i] || "";
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
