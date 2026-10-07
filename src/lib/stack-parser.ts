export interface StackItem {
  id: string;
  name: string;
  version: string;
  source: string;
  sourceUrl?: string;
  status: string;
  port?: number;
  runtime?: "Native" | "Container" | "Binary";
  env?: Record<string, string>;
  command?: string;
}

export interface SearchResultItem {
  id: string;
  name: string;
  version: string;
  source: string;
  sourceUrl: string;
}

export function createNodeFromSearch(item: SearchResultItem): StackItem {
  return {
    id: `${item.id}-${Math.random().toString(36).substring(2, 6)}`,
    name: item.name,
    version: item.version,
    source: item.source,
    sourceUrl: item.sourceUrl,
    status: "Running",
    port: 80,
    runtime: "Native",
    env: {},
  };
}

export function createSoftwareNodeData(
  name: string,
  version: string = "latest",
  source: string = ""
): StackItem {
  const clean = name.trim();
  const slug = clean.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return {
    id: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
    name: clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Service",
    version: version || "latest",
    source: source || (slug ? `${slug}.org` : ""),
    sourceUrl: "",
    status: "Running",
    port: 80,
    runtime: "Native",
    env: {},
  };
}
