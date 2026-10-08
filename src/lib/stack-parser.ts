export interface StackItem {
  id: string;
  name: string;
  version: string;
  versions?: string[];
  source: string;
  sourceUrl?: string;
  command?: string;
  args?: string;
  inputs?: Record<string, string>;
  autoConfirm?: boolean;
}

export interface SearchResultItem {
  id: string;
  name: string;
  version: string;
  versions?: string[];
  source: string;
  sourceUrl: string;
  command?: string;
  args?: string;
  inputs?: Record<string, string>;
  autoConfirm?: boolean;
}

export function createNodeFromSearch(item: SearchResultItem): StackItem {
  return {
    id: `${item.id}-${Math.random().toString(36).substring(2, 6)}`,
    name: item.name,
    version: item.version,
    versions: item.versions && item.versions.length > 0 ? item.versions : [item.version || "latest"],
    source: item.source,
    sourceUrl: item.sourceUrl,
    command: item.command || "",
    args: item.args || "",
    autoConfirm: item.autoConfirm !== false,
  };
}

export function createSoftwareNodeData(
  name: string,
  version: string = "latest",
  source: string = "",
  versions?: string[]
): StackItem {
  const clean = name.trim();
  const slug = clean.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return {
    id: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
    name: clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Process",
    version: version || "latest",
    versions: versions && versions.length > 0 ? versions : [version || "latest"],
    source: source || (slug ? `${slug}.com` : ""),
    sourceUrl: "",
    command: "",
    args: "",
    autoConfirm: true,
  };
}

export interface ParsedSoftwareItem {
  name: string;
  version?: string;
}

export function parseSlugToSoftware(slug: string): ParsedSoftwareItem[] {
  let items: string[] = [];

  if (slug.includes("+")) {
    items = slug.split("+").map(decodeURIComponent).filter(Boolean);
  } else if (slug.includes(",")) {
    items = slug.split(",").map(decodeURIComponent).filter(Boolean);
  } else if (slug.includes("_")) {
    items = slug.split("_").map(decodeURIComponent).filter(Boolean);
  } else {
    const parts = slug.split("-").map(decodeURIComponent).filter(Boolean);
    // If the last part is a random nanoid hash (6 alphanumeric characters) and there are previous parts, strip the hash
    if (parts.length > 1 && /^[2-9a-km-z]{6}$/i.test(parts[parts.length - 1])) {
      items = parts.slice(0, -1);
    } else {
      items = parts;
    }
  }

  return items.map((raw) => {
    const [name, version] = raw.split(/[@:]/);
    return {
      name: name.trim(),
      version: version ? version.trim() : undefined,
    };
  });
}
