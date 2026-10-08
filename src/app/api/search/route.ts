import { NextRequest, NextResponse } from "next/server";

export interface SearchResultItem {
  id: string;
  name: string;
  version: string;
  versions: string[];
  source: string;
  sourceUrl: string;
  command?: string;
}

const searchCache = new Map<string, { data: SearchResultItem[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 mins

// Exclude tutorial blogs, forums, shopping sites, social media, question sites, and encyclopedias
const JUNK_KEYWORDS = [
  "wikipedia", "hostinger", "geeksforgeeks", "medium", "youtube", "reddit",
  "quora", "stackoverflow", "w3schools", "ebay", "amazon", "flickr",
  "facebook", "twitter", "x.com", "instagram", "linkedin", "pinterest",
  "bing.com", "google.com", "duckduckgo.com", "apple.com", "imdb.com",
  "computingforgeeks", "tecmint", "linuxiac", "cyberciti", "linuxbabe",
  "ubuntupit", "howtoforge", "linuxhint", "tutorialspoint", "fosslinux",
  "techrepublic", "devconnected", "digitalocean", "vultr", "linode",
  "cpanelfree", "minextuts", "scribeage", "veeble", "commandlinux",
  "supportsages", "cloudzy", "atlantic.net"
];

const ARTICLE_PATTERNS = [
  /^(what is|how to|why\b|pros and cons|guide to|introduction to|review|tutorial|top \d+|best \d+|install and use)/i,
  /\b(pros and cons|tutorial|\bvs\b|review|alternative to|step[- ]by[- ]step|beginner guide|installation guide|on ubuntu|on debian|on centos|on rocky)\b/i,
];

function decodeDdgUrl(href: string): string {
  const match = href.match(/[?&]uddg=([^&]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return href;
    }
  }
  return href;
}

function decodeBingUrl(bingHref: string): string {
  const clean = bingHref.replace(/&amp;/g, "&");
  const uMatch = clean.match(/[?&]u=a1([^&]+)/);
  if (uMatch) {
    try {
      const b64 = uMatch[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? b64 : b64 + "=".repeat(4 - (b64.length % 4));
      return Buffer.from(pad, "base64").toString("utf-8");
    } catch {
      return bingHref;
    }
  }
  return bingHref;
}

function isJunkDomainOrTitle(domain: string, title: string): boolean {
  const d = domain.toLowerCase();
  if (JUNK_KEYWORDS.some((k) => d.includes(k))) return true;
  if (ARTICLE_PATTERNS.some((p) => p.test(title))) return true;
  return false;
}

function extractInstallCommand(rawHtml: string): string | null {
  const text = rawHtml
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // Pipe command: curl ... | bash or wget ... | bash
  const pipeMatch = text.match(/(?:curl|wget)\s+[^\n<`"'\$]+(?:\|\s*(?:bash|sh|sudo\s+bash|sudo\s+sh))/i);
  if (pipeMatch) {
    return pipeMatch[0].replace(/<[^>]+>/g, "").trim();
  }

  // Chained command: curl -O ... && bash ... or wget -O ... && bash ...
  const seqMatch = text.match(/(?:curl|wget)\s+[^\n<`"'\$]+(?:&&|;)\s*(?:sudo\s+)?(?:bash|sh)\s+[^\s<"';&]+/i);
  if (seqMatch) {
    return seqMatch[0].replace(/<[^>]+>/g, "").trim();
  }

  // cPanel specific sequence: curl -o latest -L ... && sh latest
  const cpanelMatch = text.match(/curl\s+-[a-zA-Z]+\s+[^\n<"'\$]+securedownloads\.cpanel\.net\/latest/i);
  if (cpanelMatch) {
    return "cd /home && curl -o latest -L https://securedownloads.cpanel.net/latest && sh latest";
  }

  return null;
}

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
  const seenNames = new Set<string>();

  const addResult = (
    rawTitle: string,
    rawDomain: string,
    realUrl: string,
    foundCommand = ""
  ) => {
    let cleanDomain = rawDomain
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[›/\s]/)[0]
      .trim();

    if (!cleanDomain || seenDomains.has(cleanDomain)) return;
    if (isJunkDomainOrTitle(cleanDomain, rawTitle)) return;

    // Never show generic "GitHub" entry
    if (cleanDomain.includes("github.com")) {
      if (rawTitle.toLowerCase().startsWith("github") && results.length > 0) {
        return;
      }
    }

    seenDomains.add(cleanDomain);

    const queryClean = query.toLowerCase().replace(/[^a-z0-9]/g, "");
    const domainBase = cleanDomain.split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");

    // Determine normalized software name
    let cleanName = query.charAt(0).toUpperCase() + query.slice(1);

    if (domainBase === queryClean || cleanDomain.startsWith(queryClean + ".")) {
      // Direct official domain (e.g. aapanel.com -> aaPanel)
      const m = rawTitle.match(new RegExp(`\\b(${query})\\b`, "i"));
      cleanName = m ? m[0] : cleanName;
    } else if (cleanDomain.includes("github.com")) {
      try {
        const pathParts = new URL(realUrl).pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2) {
          cleanName = pathParts[1].replace(/[-_]/g, " ");
        }
      } catch {
        // keep cleanName
      }
    } else {
      const parts = rawTitle.split(/[|\-:–]/).map((p) => p.trim());
      const matchPart = parts.find((p) => p.toLowerCase().includes(query.toLowerCase()));
      if (matchPart && matchPart.length < 25) {
        cleanName = matchPart.replace(/(download|free|official|linux|install)\s*/gi, "").trim() || cleanName;
      }
    }

    // Deduplicate by normalized name (e.g. don't show 3 aaPanel items)
    const normKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seenNames.has(normKey)) return;
    seenNames.add(normKey);

    // Extract software version safely without confusing with host OS versions (e.g. Ubuntu 24.04)
    const titleWithoutDistro = rawTitle.replace(/\b(ubuntu|debian|centos|fedora|rocky|alma|rhel|linux)\s*\d+(\.\d+)*/gi, "");
    const vMatch = titleWithoutDistro.match(/v?(\d+\.\d+(\.\d+)?)/);
    const parsedVersion = vMatch ? vMatch[1] : "latest";

    const versions = Array.from(new Set([parsedVersion, "latest", "stable", "lts"]));

    let command = foundCommand;
    if (!command) {
      if (realUrl.endsWith(".sh")) {
        command = `curl -fsSL ${realUrl} | bash`;
      } else if (cleanDomain.includes("aapanel.com")) {
        command = "curl -sSO https://www.aapanel.com/script/install_7.0_en.sh && bash install_7.0_en.sh aapanel";
      } else if (cleanDomain.includes("cpanel.net")) {
        command = "cd /home && curl -o latest -L https://securedownloads.cpanel.net/latest && sh latest";
      } else if (cleanDomain.includes("docker.com")) {
        command = "curl -fsSL https://get.docker.com | sh";
      } else {
        command = `$PKG_INSTALL ${cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, "")}`;
      }
    }

    results.push({
      id: cleanDomain.replace(/[^a-z0-9]/gi, "-"),
      name: cleanName,
      version: parsedVersion,
      versions,
      source: cleanDomain,
      sourceUrl: realUrl,
      command,
    });
  };

  // 1. Query DuckDuckGo HTML Search
  const fetchDDGHtml = async () => {
    try {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " install script")}`;
      const res = await fetch(ddgUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!res.ok) return;
      const html = await res.text();
      const resultBlocks = html.match(/<div class="result results_links[^"]*"[\s\S]*?<\/div>\s*<\/div>/g) || [];

      for (const block of resultBlocks) {
        if (results.length >= 4) break;
        const linkMatch = block.match(/<a class="result__url"[^>]*href="([^"]+)"/);
        const titleMatch = block.match(/<h2 class="result__title">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);

        if (linkMatch && titleMatch) {
          const rawHref = linkMatch[1];
          const realUrl = decodeDdgUrl(rawHref);
          const rawTitle = titleMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();

          let domain = "";
          try {
            domain = new URL(realUrl).hostname;
          } catch {
            continue;
          }

          addResult(rawTitle, domain, realUrl);
        }
      }
    } catch (err) {
      console.error("DDG search error:", err);
    }
  };

  // 2. Query Bing Search
  const fetchBing = async () => {
    try {
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query + " official linux install script")}&setlang=en&mkt=en-US`;
      const res = await fetch(bingUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) return;
      const html = await res.text();
      const algos = html.match(/<li class="b_algo"[\s\S]*?<\/li>/g) || [];

      for (const item of algos) {
        if (results.length >= 4) break;
        const titleMatch = item.match(/<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/);
        const domainMatch =
          item.match(/<div class="tptt">([^<]+)<\/div>/) ||
          item.match(/<cite[^>]*>([\s\S]*?)<\/cite>/);

        if (titleMatch && domainMatch) {
          const rawHref = titleMatch[1];
          const realUrl = decodeBingUrl(rawHref);
          const rawTitle = titleMatch[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
          const rawDomain = domainMatch[1].replace(/<[^>]+>/g, "").trim();

          addResult(rawTitle, rawDomain, realUrl);
        }
      }
    } catch (err) {
      console.error("Bing search error:", err);
    }
  };

  await Promise.allSettled([fetchDDGHtml(), fetchBing()]);

  // Deep inspect the top 2 candidate websites to retrieve exact script if missing
  const deepScanPromises = results.slice(0, 2).map(async (item) => {
    if (item.command && !item.command.startsWith("$PKG_INSTALL")) return;
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(item.sourceUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      });
      clearTimeout(tid);
      if (!res.ok) return;

      const text = await res.text();
      const found = extractInstallCommand(text);
      if (found) {
        item.command = found;
      }
    } catch {
      // Ignore network timeout
    }
  });

  await Promise.allSettled(deepScanPromises);

  // Prioritize exact match on query
  const queryClean = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  results.sort((a, b) => {
    const aMatch = a.source.startsWith(queryClean) || a.name.toLowerCase() === query.toLowerCase();
    const bMatch = b.source.startsWith(queryClean) || b.name.toLowerCase() === query.toLowerCase();
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  // Limit suggestions to max 4 clean, distinct software choices
  const finalResults = results.slice(0, 4);

  searchCache.set(cacheKey, { data: finalResults, timestamp: Date.now() });
  return NextResponse.json({ results: finalResults });
}
