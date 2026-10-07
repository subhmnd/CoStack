import {
  fetchOfficialSoftware,
  searchOfficialSources,
  NormalizedSoftware,
} from "./fetcher/official-source-fetcher";

export interface ActiveRule {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceName: string;
  targetName: string;
  type: "required" | "recommended" | "compatible" | "custom";
  message: string;
  isValid: boolean;
}

export { fetchOfficialSoftware, searchOfficialSources };
export type { NormalizedSoftware };

/**
 * Dynamic rule evaluator for stack canvas nodes and edges.
 * Evaluates node relationships, dependencies, and health checks on the fly.
 */
export function evaluateStackRules(
  nodes: Array<{ id: string; techId: string; label: string; data?: any }>,
  edges: Array<{ id: string; source: string; target: string }>
): ActiveRule[] {
  const rules: ActiveRule[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Check each connected edge to establish relationship rule
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    rules.push({
      id: `rule-${edge.id}`,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourceName: sourceNode.label,
      targetName: targetNode.label,
      type: "compatible",
      message: `${sourceNode.label} ──► ${targetNode.label} (Linked)`,
      isValid: true,
    });
  }

  // Check for common dependencies (e.g. applications needing databases or docker)
  for (const node of nodes) {
    const techId = node.techId.toLowerCase();
    const isApp = ["nextcloud", "wordpress", "ghost", "strapi"].some((a) => techId.includes(a));
    const hasDbNode = nodes.some((n) =>
      ["postgres", "mysql", "mariadb", "mongo"].some((db) => n.techId.toLowerCase().includes(db))
    );

    if (isApp) {
      if (hasDbNode) {
        rules.push({
          id: `rule-dep-${node.id}`,
          sourceNodeId: "",
          targetNodeId: node.id,
          sourceName: "Database",
          targetName: node.label,
          type: "required",
          message: `${node.label} ✓ Database backend configured`,
          isValid: true,
        });
      } else {
        rules.push({
          id: `rule-missing-db-${node.id}`,
          sourceNodeId: "",
          targetNodeId: node.id,
          sourceName: "Database",
          targetName: node.label,
          type: "required",
          message: `${node.label} requires a database (e.g. PostgreSQL or MariaDB)`,
          isValid: false,
        });
      }
    }
  }

  return rules;
}
