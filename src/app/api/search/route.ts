import { NextRequest, NextResponse } from "next/server";

export interface SearchResultItem {
  id: string;
  name: string;
  version: string;
  source: string;
  sourceUrl: string;
}

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
    const seenNames = new Set<string>();

    // 1. Concurrently query GitHub Repositories and Docker Hub Registry
    const [ghPromise, dockerPromise] = await Promise.allSettled([
      fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+in:name&sort=stars&order=desc&per_page=4`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "CoStack-Search/1.0",
          },
          next: { revalidate: 1800 },
        }
      ),
      fetch(
        `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(query)}&page_size=4`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "CoStack-Search/1.0",
          },
          next: { revalidate: 1800 },
        }
      ),
    ]);

    // Process GitHub results
    if (ghPromise.status === "fulfilled" && ghPromise.value.ok) {
      try {
        const ghData = await ghPromise.value.json();
        if (ghData.items && Array.isArray(ghData.items)) {
          for (const repo of ghData.items.slice(0, 3)) {
            const cleanName = repo.name;
            if (seenNames.has(cleanName.toLowerCase())) continue;
            seenNames.add(cleanName.toLowerCase());

            let latestVersion = "latest";
            // Check releases for version
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
              // fallback
            }

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
              id: cleanName.toLowerCase(),
              name: cleanName,
              version: latestVersion,
              source: sourceDomain,
              sourceUrl: repo.homepage || repo.html_url,
            });
          }
        }
      } catch {
        // gh parse error
      }
    }

    // Process Docker Hub results for official images
    if (dockerPromise.status === "fulfilled" && dockerPromise.value.ok) {
      try {
        const dockerData = await dockerPromise.value.json();
        if (dockerData.results && Array.isArray(dockerData.results)) {
          for (const item of dockerData.results) {
            const rawRepo: string = item.repo_name;
            const shortName = rawRepo.includes("/") ? rawRepo.split("/")[1] : rawRepo;
            if (seenNames.has(shortName.toLowerCase())) continue;

            const isOfficial = item.is_official === true;
            if (isOfficial || item.star_count > 50) {
              seenNames.add(shortName.toLowerCase());

              // Fetch live version tag
              let version = "latest";
              try {
                const tagUrl = rawRepo.includes("/")
                  ? `https://hub.docker.com/v2/repositories/${rawRepo}/tags?page_size=1&ordering=last_updated`
                  : `https://hub.docker.com/v2/repositories/library/${rawRepo}/tags?page_size=1&ordering=last_updated`;

                const tagRes = await fetch(tagUrl, {
                  headers: { Accept: "application/json" },
                  next: { revalidate: 3600 },
                });
                if (tagRes.ok) {
                  const tagData = await tagRes.json();
                  if (tagData.results && tagData.results.length > 0) {
                    version = tagData.results[0].name || "latest";
                  }
                }
              } catch {
                // tag error
              }

              results.push({
                id: shortName.toLowerCase(),
                name: shortName.charAt(0).toUpperCase() + shortName.slice(1),
                version,
                source: isOfficial ? "docker.com (Official)" : rawRepo,
                sourceUrl: `https://hub.docker.com/_/${shortName}`,
              });
            }
          }
        }
      } catch {
        // docker parse error
      }
    }

    // Fallback if no repositories match
    if (results.length === 0) {
      results.push({
        id: query.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
        name: query.charAt(0).toUpperCase() + query.slice(1),
        version: "latest",
        source: `${query.toLowerCase().replace(/[^a-z0-9_-]/g, "")}.org`,
        sourceUrl: `https://${query.toLowerCase().replace(/[^a-z0-9_-]/g, "")}.org`,
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
          source: `${query.toLowerCase()}.org`,
          sourceUrl: "",
        },
      ],
    });
  }
}
