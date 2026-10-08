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
const CACHE_TTL = 1000 * 60 * 5; // 5 mins

// Exclude non-software domains (social media, consumer shopping, blog tutorials)
const JUNK_KEYWORDS = [
  "wikipedia", "hostinger", "geeksforgeeks", "medium", "youtube", "reddit",
  "quora", "stackoverflow", "w3schools", "ebay", "amazon", "flickr",
  "facebook", "twitter", "x.com", "instagram", "linkedin", "pinterest",
  "bing.com", "google.com", "duckduckgo.com", "apple.com", "imdb.com",
  "computingforgeeks", "tecmint", "linuxiac", "cyberciti", "linuxbabe",
  "ubuntupit", "howtoforge", "linuxhint", "tutorialspoint", "fosslinux",
  "techrepublic", "devconnected", "digitalocean", "vultr", "linode",
  "cpanelfree", "minextuts", "scribeage", "veeble", "commandlinux",
  "supportsages", "cloudzy", "atlantic.net", "softonic", "filehorse",
  "uptodown", "cnet.com", "download.cnet.com", "tomsguide", "softpedia", "malavida"
];

function scoreCandidateUrl(url: string): number {
  let score = 0;
  if (url.endsWith(".sh") || url.endsWith(".bash")) score += 25;
  if (url.includes("get.") || url.includes("/get/")) score += 20;
  if (/install-script|download-script|quick-install/i.test(url)) score += 15;
  if (/(?:linux|ubuntu|debian|centos|rocky|alma|rhel|server|engine)\b/i.test(url)) score += 10;
  if (/(?:install|download|setup|script)/i.test(url)) score += 5;
  if (/(?:windows|win-|macos|mac-|darwin|ios|android|desktop)\b/i.test(url) || /\.(?:exe|dmg|pkg|msi|apk)$/i.test(url)) {
    score -= 100;
  }
  return score;
}

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

function normalizeScriptUrl(url: string): string {
  if (url.includes("github.com") && url.includes("/blob/")) {
    return url.replace("https://github.com/", "https://raw.githubusercontent.com/").replace("/blob/", "/");
  }
  return url;
}

function getProjectKey(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const parts = host.split(".");
    const rootDomain = /(?:co|com|org|net|gov|edu)\.[a-z]{2}$/i.test(host)
      ? parts.slice(-3).join(".")
      : parts.slice(-2).join(".");
    if (rootDomain === "github.com") {
      const pathParts = u.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        return `github.com/${pathParts[0].toLowerCase()}/${pathParts[1].toLowerCase()}`;
      }
    }
    return rootDomain || host;
  } catch {
    return "unknown";
  }
}

/**
 * Purely generic extraction of installer commands from webpage text.
 * No hardcoded software names or domains.
 */
function extractGenericCommand(rawHtml: string, pageUrl: string): string | null {
  if (rawHtml.trim().startsWith("#!/bin/sh") || rawHtml.trim().startsWith("#!/bin/bash")) {
    return `curl -fsSL ${normalizeScriptUrl(pageUrl)} | bash`;
  }

  const text = rawHtml
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // Check data-clipboard-text or class="command" (direct copy snippets provided by vendor)
  const clipMatch =
    text.match(/data-clipboard-text=["']([^"']*(?:curl|wget|bash|sh)[^"']*)["']/i) ||
    text.match(/class=["'][^"']*command[^"']*["'][^>]*>([^<]*(?:curl|wget|bash|sh)[^<]*)<\/div>/i);
  if (clipMatch) {
    const cleanCmd = clipMatch[1].replace(/&amp;/g, "&").trim();
    return normalizeScriptUrl(cleanCmd);
  }

  // Check code / pre blocks first (authoritative on developer docs / github)
  const codeBlocks = text.match(/<(?:pre|code)[^>]*>([\s\S]*?)<\/(?:pre|code)>/gi) || [];
  for (const cb of codeBlocks) {
    const clean = cb.replace(/<[^>]+>/g, "").trim();
    if (
      (clean.includes("curl") || clean.includes("wget")) &&
      (clean.includes(".sh") || clean.includes("|") || clean.includes("bash") || clean.includes("sh") || clean.includes("get."))
    ) {
      const lines = clean
        .split("\n")
        .map((l) => l.replace(/^\$\s+/, "").trim())
        .filter((l) => l && !l.includes("--dry-run"));
      let joined = lines.join(" && ");
      if (joined.includes("chmod +x") && !joined.includes("./")) {
        const shMatch = joined.match(/chmod\s+\+x\s+([^\s;&]+\.sh)/);
        if (shMatch) {
          joined = `${joined} && ./${shMatch[1]}`;
        }
      }
      return normalizeScriptUrl(joined);
    }
  }

  // Pipe pattern: curl/wget ... | [sudo] bash/sh
  const pipeMatch = text.match(/(?:curl|wget)\s+[^\n<`"'\$]+(?:\|\s*(?:sudo\s+)?(?:bash|sh))/i);
  if (pipeMatch) {
    return normalizeScriptUrl(pipeMatch[0].replace(/<[^>]+>/g, "").replace(/^\$\s+/, "").trim());
  }

  // Chained download + execute: curl/wget ... && [sudo] bash/sh ...
  const seqMatch = text.match(/(?:curl|wget)\s+[^\n<`"'\$]+(?:&&|;)\s*(?:sudo\s+)?(?:bash|sh)\s+[^\s<"';&]+/i);
  if (seqMatch) {
    return normalizeScriptUrl(seqMatch[0].replace(/<[^>]+>/g, "").replace(/^\$\s+/, "").trim());
  }

  // Multi-line download and run: curl -o <name> -L <url> ... sh <name>
  const dlRunMatch = text.match(/curl\s+-[a-zA-Z]+\s+([a-zA-Z0-9_\.-]+)\s+-L\s+[^\s<"';&]+[\s\S]{1,100}?\bsh\s+\1/i);
  if (dlRunMatch) {
    const lines = dlRunMatch[0].split("\n").map((l) => l.replace(/^\$\s+/, "").trim()).filter(Boolean);
    return normalizeScriptUrl(lines.join(" && "));
  }

  // Direct link to a shell script file (.sh or .bash) on the page
  const shLinkMatch = rawHtml.match(/href=["']([^"']+\.(?:sh|bash))["']/i);
  if (shLinkMatch) {
    try {
      const resolved = new URL(shLinkMatch[1], pageUrl).toString();
      return `curl -fsSL ${normalizeScriptUrl(resolved)} | bash`;
    } catch {}
  }

  return null;
}

export async function resolveSoftware(query: string, noCache = false): Promise<SearchResultItem[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const cacheKey = cleanQuery.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (!noCache && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  interface Candidate {
    title: string;
    projectKey: string;
    domain: string;
    url: string;
  }

  const rawCandidates: Candidate[] = [];

  // 1. DuckDuckGo Search
  const fetchDDGHtml = async () => {
    try {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery + " install script")}`;
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
        const linkMatch = block.match(/<a class="result__url"[^>]*href="([^"]+)"/);
        const titleMatch = block.match(/<h2 class="result__title">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/);

        if (linkMatch && titleMatch) {
          const rawHref = linkMatch[1];
          const realUrl = decodeDdgUrl(rawHref);
          const rawTitle = titleMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();

          let domain = "";
          try {
            domain = new URL(realUrl).hostname.toLowerCase().replace(/^www\./, "");
          } catch {
            continue;
          }

          if (isJunkDomainOrTitle(domain, rawTitle)) continue;

          const projectKey = getProjectKey(realUrl);
          rawCandidates.push({ title: rawTitle, projectKey, domain, url: realUrl });
        }
      }
    } catch {}
  };

  // 2. Bing Search
  const fetchBing = async () => {
    try {
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(cleanQuery + " official linux install script")}&setlang=en&mkt=en-US`;
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
        const titleMatch = item.match(/<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/);
        const domainMatch =
          item.match(/<div class="tptt">([^<]+)<\/div>/) ||
          item.match(/<cite[^>]*>([\s\S]*?)<\/cite>/);

        if (titleMatch && domainMatch) {
          const rawHref = titleMatch[1];
          const realUrl = decodeBingUrl(rawHref);
          const rawTitle = titleMatch[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();

          let domain = "";
          try {
            domain = new URL(realUrl).hostname.toLowerCase().replace(/^www\./, "");
          } catch {
            continue;
          }

          if (isJunkDomainOrTitle(domain, rawTitle)) continue;

          const projectKey = getProjectKey(realUrl);
          rawCandidates.push({ title: rawTitle, projectKey, domain, url: realUrl });
        }
      }
    } catch {}
  };

  // 3. get.<domain> shortcuts (e.g. get.docker.com, get.k3s.io)
  const fetchGetDomain = async () => {
    const cleanQ = cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!cleanQ) return;
    const tlds = ["com", "io", "sh", "net", "org", "dev", "app"];
    await Promise.allSettled(
      tlds.map(async (tld) => {
        try {
          const targetUrl = `https://get.${cleanQ}.${tld}/`;
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(targetUrl, {
            signal: controller.signal,
            headers: { "User-Agent": "curl/8.1.0" },
          });
          clearTimeout(tid);
          if (res.ok) {
            const domain = `${cleanQ}.${tld}`;
            rawCandidates.push({
              title: `${cleanQ} Installer`,
              projectKey: domain,
              domain,
              url: targetUrl,
            });
          }
        } catch {}
      })
    );
  };

  // 4. GitHub Search API
  const fetchGitHubSearch = async () => {
    try {
      const cleanQ = cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, "");
      const ghUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(cleanQuery + " install")}&sort=stars&order=desc&per_page=3`;
      const res = await fetch(ghUrl, {
        headers: {
          "User-Agent": "CoStack-App",
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      for (const item of data.items || []) {
        const projectKey = `github.com/${item.full_name.toLowerCase()}`;
        rawCandidates.push({
          title: item.name,
          projectKey,
          domain: "github.com",
          url: item.html_url,
        });

        // Try raw script paths
        const scriptNames = ["install.sh", `${cleanQ}-install.sh`, "setup.sh"];
        for (const sName of scriptNames) {
          const rawUrl = `https://raw.githubusercontent.com/${item.full_name}/master/${sName}`;
          try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 1500);
            const headRes = await fetch(rawUrl, { signal: controller.signal, method: "HEAD" });
            clearTimeout(tid);
            if (headRes.ok) {
              rawCandidates.push({
                title: `${item.name} Installer`,
                projectKey,
                domain: "github.com",
                url: rawUrl,
              });
              break;
            }
          } catch {}
        }
      }
    } catch {}
  };

  await Promise.allSettled([fetchDDGHtml(), fetchBing(), fetchGetDomain(), fetchGitHubSearch()]);

  // Group candidate URLs by software project / root domain
  const projectCandidatesMap = new Map<string, Candidate[]>();
  for (const c of rawCandidates) {
    const list = projectCandidatesMap.get(c.projectKey) || [];
    list.push(c);
    projectCandidatesMap.set(c.projectKey, list);
  }

  // Sort project keys: prioritize project keys that match query
  const queryClean = cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, "");
  const sortedProjectKeys = Array.from(projectCandidatesMap.keys()).sort((a, b) => {
    const aClean = a.replace(/[^a-z0-9]/g, "");
    const bClean = b.replace(/[^a-z0-9]/g, "");
    const aMatch = aClean.startsWith(queryClean);
    const bMatch = bClean.startsWith(queryClean);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const results: SearchResultItem[] = [];
  const seenNames = new Set<string>();

  for (const projectKey of sortedProjectKeys) {
    if (results.length >= 4) break;
    const cList = projectCandidatesMap.get(projectKey) || [];

    // Sort candidates for this project: prioritize URLs with .sh, get., Linux distros, and penalize non-Linux
    cList.sort((a, b) => scoreCandidateUrl(b.url) - scoreCandidateUrl(a.url));

    const primary = cList[0];
    const domainBase = primary.domain.split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");

    let cleanName = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);
    if (domainBase === queryClean || primary.domain.startsWith(queryClean + ".")) {
      const m = primary.title.match(new RegExp(`\\b(${cleanQuery})\\b`, "i"));
      cleanName = m ? m[0] : cleanName;
    } else if (projectKey.startsWith("github.com/")) {
      try {
        const pathParts = projectKey.split("/").slice(1);
        if (pathParts.length >= 2) {
          cleanName = pathParts[1].replace(/[-_]/g, " ");
        }
      } catch {}
    } else {
      const parts = primary.title.split(/[|\-:–]/).map((p) => p.trim());
      const matchPart = parts.find((p) => p.toLowerCase().includes(cleanQuery.toLowerCase()));
      if (matchPart && matchPart.length < 25) {
        cleanName = matchPart.replace(/(download|free|official|linux|install)\s*/gi, "").trim() || cleanName;
      }
    }

    const normKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seenNames.has(normKey)) continue;
    seenNames.add(normKey);

    const titleWithoutDistro = primary.title.replace(/\b(ubuntu|debian|centos|fedora|rocky|alma|rhel|linux)\s*\d+(\.\d+)*/gi, "");
    const vMatch = titleWithoutDistro.match(/v?(\d+\.\d+(\.\d+)?)/);
    const parsedVersion = vMatch ? vMatch[1] : "latest";

    // Scan candidate URLs for this project to find the official script
    let foundScript = "";
    let bestUrl = primary.url;

    for (const c of cList.slice(0, 5)) {
      if (c.url.endsWith(".sh")) {
        const rawUrl = normalizeScriptUrl(c.url);
        foundScript = `curl -fsSL ${rawUrl} | bash`;
        bestUrl = rawUrl;
        break;
      }

      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(c.url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
        });
        clearTimeout(tid);
        if (!res.ok) continue;

        const text = await res.text();
        const cmd = extractGenericCommand(text, c.url);
        if (cmd) {
          foundScript = cmd;
          bestUrl = c.url;
          break;
        }
      } catch {}
    }

    const finalCmd = foundScript || `$PKG_INSTALL ${cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, "")}`;
    const displayDomain = projectKey.startsWith("github.com/") ? projectKey : primary.domain;

    results.push({
      id: projectKey.replace(/[^a-z0-9]/gi, "-"),
      name: cleanName,
      version: parsedVersion,
      versions: Array.from(new Set([parsedVersion, "latest", "stable", "lts"])),
      source: displayDomain,
      sourceUrl: bestUrl,
      command: finalCmd,
    });
  }

  // Prioritize results with discovered installation scripts over generic package fallbacks
  results.sort((a, b) => {
    const aHasScript = !a.command?.startsWith("$PKG_INSTALL");
    const bHasScript = !b.command?.startsWith("$PKG_INSTALL");
    if (aHasScript && !bHasScript) return -1;
    if (!aHasScript && bHasScript) return 1;

    const aMatch = a.source.startsWith(queryClean) || a.name.toLowerCase() === cleanQuery.toLowerCase();
    const bMatch = b.source.startsWith(queryClean) || b.name.toLowerCase() === cleanQuery.toLowerCase();
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const finalResults = results.slice(0, 4);
  searchCache.set(cacheKey, { data: finalResults, timestamp: Date.now() });

  return finalResults;
}
