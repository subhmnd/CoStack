import { stringify } from "yaml";

export interface StackNodeData {
  id?: string;
  name: string;
  version: string;
  source?: string;
  sourceUrl?: string;
  command?: string;
  args?: string;
  inputs?: Record<string, string>;
  autoConfirm?: boolean;
}

export interface ManifestNode {
  id: string;
  position: { x: number; y: number };
  data: StackNodeData;
}

export interface ManifestEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}

export interface CoStackManifest {
  version: "costack/v1";
  slug: string;
  name: string;
  generatedAt: string;
  targetOS: string[];
  nodes: ManifestNode[];
  edges: ManifestEdge[];
  executionOrder: string[];
}

/**
 * Topologically sorts nodes according to directed edges DAG
 */
export function resolveDAGOrder(nodes: ManifestNode[], edges: ManifestEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (adj.has(edge.source) && inDegree.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(nodeId);
    }
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    order.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      const newDeg = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Handle remaining unvisited nodes (e.g. disconnected or cycles)
  for (const node of nodes) {
    if (!order.includes(node.id)) {
      order.push(node.id);
    }
  }

  return order;
}

export function generateStackManifest(
  slug: string,
  name: string,
  nodes: ManifestNode[],
  edges: ManifestEdge[]
): {
  manifest: CoStackManifest;
  json: string;
  yaml: string;
} {
  const executionOrder = resolveDAGOrder(nodes, edges);

  const manifest: CoStackManifest = {
    version: "costack/v1",
    slug,
    name: name || `Stack-${slug}`,
    generatedAt: new Date().toISOString(),
    targetOS: ["ubuntu-24.04", "ubuntu-22.04", "debian-12", "rhel-9"],
    nodes,
    edges,
    executionOrder,
  };

  const json = JSON.stringify(manifest, null, 2);
  const yamlString = stringify(manifest);

  return {
    manifest,
    json,
    yaml: yamlString,
  };
}
