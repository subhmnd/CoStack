export interface ParsedSoftwareItem {
  id: string;
  name: string;
  version: string;
  status: "Running" | "Configured" | "Healthy" | "Idle";
  port: number;
  runtime: "Native" | "Container" | "Binary";
  env: Record<string, string>;
}

export interface SearchSuggestion {
  id: string;
  title: string;
  description: string;
  items: string[];
}

// Common default ports for standard system components if recognized
function getDefaultPort(name: string): number {
  const lower = name.toLowerCase();
  if (lower.includes("postgres") || lower.includes("psql")) return 5432;
  if (lower.includes("redis")) return 6379;
  if (lower.includes("mysql") || lower.includes("mariadb")) return 3306;
  if (lower.includes("mongo")) return 27017;
  if (lower.includes("caddy")) return 443;
  if (lower.includes("nginx")) return 80;
  if (lower.includes("nextcloud")) return 8080;
  if (lower.includes("wordpress") || lower.includes("wp")) return 8000;
  if (lower.includes("grafana")) return 3000;
  if (lower.includes("prometheus")) return 9090;
  if (lower.includes("meili")) return 7700;
  return 8080;
}

// Sensible default version tags
function getDefaultVersion(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("docker")) return "29.x";
  if (lower.includes("nextcloud")) return "30.x";
  if (lower.includes("postgres")) return "16.x";
  if (lower.includes("redis")) return "7.x";
  if (lower.includes("wordpress")) return "6.x";
  if (lower.includes("mariadb")) return "11.x";
  if (lower.includes("nginx")) return "1.26";
  if (lower.includes("caddy")) return "2.8";
  if (lower.includes("node")) return "22.x";
  return "1.0.x";
}

export function formatDisplayName(token: string): string {
  const clean = token.trim();
  if (!clean) return "";
  const lower = clean.toLowerCase();
  if (lower === "postgresql" || lower === "postgres") return "PostgreSQL";
  if (lower === "nextcloud") return "Nextcloud";
  if (lower === "wordpress") return "WordPress";
  if (lower === "redis") return "Redis";
  if (lower === "docker") return "Docker";
  if (lower === "nginx") return "NGINX";
  if (lower === "mariadb") return "MariaDB";
  if (lower === "mysql") return "MySQL";
  if (lower === "caddy") return "Caddy";
  if (lower === "grafana") return "Grafana";
  if (lower === "prometheus") return "Prometheus";
  if (lower === "meilisearch") return "Meilisearch";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Parses user search query into suggestions dynamically (No external AI or APIs)
 */
export function generateSearchSuggestions(query: string): SearchSuggestion[] {
  const clean = query.trim();
  if (!clean) return [];

  // Check if query is multi-item (separated by +, comma, and, with)
  const tokens = clean
    .split(/[+,]|(?:\s+and\s+)|(?:\s+with\s+)/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length > 1) {
    const formattedTokens = tokens.map(formatDisplayName);
    const title = formattedTokens.join(" + ");
    return [
      {
        id: `custom-combo-${tokens.join("-")}`,
        title,
        description: `Create stack with ${title}`,
        items: formattedTokens,
      },
    ];
  }

  // Single word search: generate intelligent combinations based on the input
  const baseName = formatDisplayName(clean);
  const lower = clean.toLowerCase();

  const suggestions: SearchSuggestion[] = [
    {
      id: `single-${lower}`,
      title: baseName,
      description: `Install ${baseName} standalone`,
      items: [baseName],
    },
  ];

  if (lower.includes("nextcloud")) {
    suggestions.push(
      {
        id: "nextcloud-postgres",
        title: "Nextcloud + PostgreSQL",
        description: "Nextcloud with PostgreSQL database backend",
        items: ["Nextcloud", "PostgreSQL"],
      },
      {
        id: "nextcloud-redis",
        title: "Nextcloud + Redis",
        description: "Nextcloud with Redis transactional memory cache",
        items: ["Nextcloud", "Redis"],
      },
      {
        id: "nextcloud-full",
        title: "Nextcloud + PostgreSQL + Redis",
        description: "Full production Nextcloud stack with database & cache",
        items: ["Nextcloud", "PostgreSQL", "Redis"],
      }
    );
  } else if (lower.includes("wordpress") || lower.includes("wp")) {
    suggestions.push(
      {
        id: "wp-mysql",
        title: "WordPress + MySQL",
        description: "WordPress with MySQL relational database",
        items: ["WordPress", "MySQL"],
      },
      {
        id: "wp-mariadb",
        title: "WordPress + MariaDB",
        description: "WordPress with MariaDB database",
        items: ["WordPress", "MariaDB"],
      },
      {
        id: "wp-redis",
        title: "WordPress + MariaDB + Redis",
        description: "WordPress with MariaDB and Redis object cache",
        items: ["WordPress", "MariaDB", "Redis"],
      }
    );
  } else if (lower.includes("docker")) {
    suggestions.push(
      {
        id: "docker-nginx",
        title: "Docker + NGINX",
        description: "Docker runtime with NGINX reverse proxy",
        items: ["Docker", "NGINX"],
      },
      {
        id: "docker-postgres",
        title: "Docker + PostgreSQL",
        description: "Docker container runtime with PostgreSQL container",
        items: ["Docker", "PostgreSQL"],
      }
    );
  } else if (lower.includes("grafana") || lower.includes("prometheus")) {
    suggestions.push({
      id: "monitoring-stack",
      title: "Prometheus + Grafana",
      description: "Metrics collection and visual dashboards",
      items: ["Prometheus", "Grafana"],
    });
  } else {
    // For any custom software name entered by the user
    suggestions.push(
      {
        id: `${lower}-postgres`,
        title: `${baseName} + PostgreSQL`,
        description: `${baseName} connected to PostgreSQL database`,
        items: [baseName, "PostgreSQL"],
      },
      {
        id: `${lower}-redis`,
        title: `${baseName} + Redis`,
        description: `${baseName} with Redis in-memory cache`,
        items: [baseName, "Redis"],
      },
      {
        id: `${lower}-full`,
        title: `${baseName} + PostgreSQL + Redis`,
        description: `${baseName} with PostgreSQL database and Redis cache`,
        items: [baseName, "PostgreSQL", "Redis"],
      }
    );
  }

  return suggestions;
}

/**
 * Creates node data structure for canvas from software name
 */
export function createSoftwareNodeData(name: string): ParsedSoftwareItem {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    version: getDefaultVersion(name),
    status: "Running",
    port: getDefaultPort(name),
    runtime: "Container",
    env: {},
  };
}
