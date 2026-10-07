export interface StackItem {
  id: string;
  name: string;
  version: string;
  versions?: string[];
  source: string;
  sourceUrl?: string;
  status: string;
  category?: string;
  command?: string;
}

export interface SearchResultItem {
  id: string;
  name: string;
  version: string;
  versions?: string[];
  source: string;
  sourceUrl: string;
  category?: string;
}

export function createNodeFromSearch(item: SearchResultItem): StackItem {
  return {
    id: `${item.id}-${Math.random().toString(36).substring(2, 6)}`,
    name: item.name,
    version: item.version,
    versions: item.versions && item.versions.length > 0 ? item.versions : [item.version || "latest"],
    source: item.source,
    sourceUrl: item.sourceUrl,
    status: "Running",
    category: item.category || "application",
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
    name: clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Service",
    version: version || "latest",
    versions: versions && versions.length > 0 ? versions : [version || "latest"],
    source: source || (slug ? `${slug}.com` : ""),
    sourceUrl: "",
    status: "Running",
    category: slug.includes("panel") ? "panel" : "application",
  };
}
