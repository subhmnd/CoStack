export interface ActiveRule {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceName: string;
  targetName: string;
  type: "relationship" | "health";
  message: string;
  isValid: boolean;
}

/**
 * Clean relationship rule evaluator.
 * Only triggers when nodes are actually connected or configured in relationships.
 */
export function evaluateStackRules(
  nodes: Array<{ id: string; label: string; data?: any }>,
  edges: Array<{ id: string; source: string; target: string; label?: string }>
): ActiveRule[] {
  const rules: ActiveRule[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Evaluate user-created relationships
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    rules.push({
      id: `rule-rel-${edge.id}`,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourceName: sourceNode.label,
      targetName: targetNode.label,
      type: "relationship",
      message: `${targetNode.label} ↓ Connected to ↓ ${sourceNode.label}`,
      isValid: true,
    });
  }

  return rules;
}
