import { NextRequest, NextResponse } from "next/server";

interface SearchResultItem {
  id: string;
  name: string;
  version: string;
  source: string;
  sourceUrl: string;
}

// In-memory cache for fast search queries
const searchCache = new Map<string, { data: SearchResultItem[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

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

  try {
    const results: SearchResultItem[] = [];

    // 1. Search GitHub Repositories for live official source and latest version
    const ghSearchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+in:name&sort=stars&order=desc&per_page=5`;
    const ghRes = await fetch(ghSearchUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "CoStack-Search/1.0",
      },
      next: { revalidate: 1800 },
    });

    if (ghRes.ok) {
      const ghData = await ghRes.json();
      if (ghData.items && Array.isArray(ghData.items)) {
        for (const repo of ghData.items.slice(0, 4)) {
          let latestVersion = "latest";

          // Try fetching latest release tag for this repo
          try {
            const relRes = await fetch(
              `https://api.github.com/repos/${repo.full_name}/releases?per_page=1`,
              {
                headers: {
                  Accept: "application/vnd.github.v3+json",
                  "User-Agent": "CoStack-Search/1.0",
                },
                next: { revalidate: 3600 },
              }
            );
            if (relRes.ok) {
              const relData = await relRes.json();
              if (Array.isArray(relData) && relData.length > 0) {
                latestVersion = relData[0].tag_name || relData[0].name || "latest";
              }
            }
          } catch {
            // release fallback
          }

          // If no release tag found, try tags API
          if (latestVersion === "latest") {
            try {
              const tagsRes = await fetch(
                `https://api.github.com/repos/${repo.full_name}/tags?per_page=1`,
                {
                  headers: {
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "CoStack-Search/1.0",
                  },
                  next: { revalidate: 3600 },
                }
              );
              if (tagsRes.ok) {
                const tagsData = await tagsRes.json();
                if (Array.isArray(tagsData) && tagsData.length > 0) {
                  latestVersion = tagsData[0].name || "latest";
                }
              }
            } catch {
              // tags fallback
            }
          }

          // Extract clean source domain (homepage or github)
          let sourceDomain = repo.full_name;
          if (repo.homepage) {
            try {
              const u = new URL(repo.homepage);
              sourceDomain = u.hostname.replace(/^www\./, "");
            } catch {
              sourceDomain = repo.homepage;
            }
          }

          results.push({
            id: repo.name.toLowerCase(),
            name: repo.name,
            version: latestVersion,
            source: sourceDomain,
            sourceUrl: repo.homepage || repo.html_url,
          });
        }
      }
    }

    // 2. If nothing found or query has specific name, generate a clean fallback item
    if (results.length === 0) {
      results.push({
        id: query.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
        name: query.charAt(0).toUpperCase() + query.slice(1),
        version: "latest",
        source: `${query.toLowerCase()}.org`,
        sourceUrl: `https://${query.toLowerCase()}.org`,
      });
    }

    // Cache results
    searchCache.set(cacheKey, { data: results, timestamp: Date.now() });

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("Search API error:", err);
    return NextResponse.json({
      results: [
        {
          id: query.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
          name: query.charAt(0).toUpperCase() + query.slice(1),
          version: "latest",
          source: "official",
          sourceUrl: "",
        },
      ],
    });
  }
}
